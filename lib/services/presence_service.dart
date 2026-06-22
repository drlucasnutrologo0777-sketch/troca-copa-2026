import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

class PresenceService {
  PresenceService._();
  static final instance = PresenceService._();

  final _db = FirebaseFirestore.instance;

  Future<({bool ok, String? erro})> ficarOnline() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return (ok: false, erro: 'Faça login primeiro.');

    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever) {
        return (
          ok: false,
          erro: 'Localização bloqueada. Abra Ajustes → Trocar Figurinhas → Localização.',
        );
      }
      if (perm == LocationPermission.denied) {
        return (ok: false, erro: 'Precisamos da localização para calcular a distância da troca.');
      }

      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        return (ok: false, erro: 'Ative o GPS/localização do aparelho e tente novamente.');
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 20),
        ),
      );

      await _db.collection('users').doc(uid).set({
        'isOnline': true,
        'lastSeen': FieldValue.serverTimestamp(),
        'latitude': pos.latitude,
        'longitude': pos.longitude,
      }, SetOptions(merge: true));

      await _db.collection('offers').doc(uid).set({
        'userId': uid,
        'latitude': pos.latitude,
        'longitude': pos.longitude,
      }, SetOptions(merge: true));

      return (ok: true, erro: null);
    } on FirebaseException catch (e) {
      return (ok: false, erro: 'Erro ao salvar online: ${e.message ?? e.code}');
    } catch (e) {
      return (ok: false, erro: 'Não foi possível ficar online. Verifique GPS e internet.');
    }
  }

  Future<void> ficarOffline() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      await _db.collection('users').doc(uid).set({
        'isOnline': false,
        'lastSeen': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (_) {}
  }

  Future<void> atualizarLocalizacao() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    final perm = await Geolocator.checkPermission();
    if (perm != LocationPermission.always && perm != LocationPermission.whileInUse) return;

    try {
      final pos = await Geolocator.getCurrentPosition();
      await _db.collection('users').doc(uid).set({
        'latitude': pos.latitude,
        'longitude': pos.longitude,
        'lastSeen': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      await _db.collection('offers').doc(uid).set({
        'userId': uid,
        'latitude': pos.latitude,
        'longitude': pos.longitude,
      }, SetOptions(merge: true));
    } catch (_) {}
  }

  Stream<bool> observarOnline(String userId) {
    return _db.collection('users').doc(userId).snapshots().map((s) {
      return s.data()?['isOnline'] == true;
    });
  }

  static Widget indicadorOnline(bool online, {double size = 10}) {
    const on = Color(0xFF2563EB);
    const off = Color(0xFF9CA3AF);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: online ? on : off,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          online ? 'Online' : 'Offline',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: online ? on : off,
          ),
        ),
      ],
    );
  }
}
