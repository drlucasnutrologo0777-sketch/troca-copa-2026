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

    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever) {
      return (ok: false, erro: 'Localização bloqueada. Ative nas configurações do navegador/celular.');
    }
    if (perm == LocationPermission.denied) {
      return (ok: false, erro: 'Precisamos da localização para calcular a distância da troca.');
    }

    final pos = await Geolocator.getCurrentPosition();
    await _db.collection('users').doc(uid).update({
      'isOnline': true,
      'lastSeen': FieldValue.serverTimestamp(),
      'latitude': pos.latitude,
      'longitude': pos.longitude,
    });

    await _db.collection('offers').doc(uid).update({
      'latitude': pos.latitude,
      'longitude': pos.longitude,
    }).catchError((_) {});

    return (ok: true, erro: null);
  }

  Future<void> ficarOffline() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    await _db.collection('users').doc(uid).update({
      'isOnline': false,
      'lastSeen': FieldValue.serverTimestamp(),
    });
  }

  Future<void> atualizarLocalizacao() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    final perm = await Geolocator.checkPermission();
    if (perm != LocationPermission.always && perm != LocationPermission.whileInUse) return;

    final pos = await Geolocator.getCurrentPosition();
    await _db.collection('users').doc(uid).update({
      'latitude': pos.latitude,
      'longitude': pos.longitude,
      'lastSeen': FieldValue.serverTimestamp(),
    });
    await _db.collection('offers').doc(uid).update({
      'latitude': pos.latitude,
      'longitude': pos.longitude,
    }).catchError((_) {});
  }

  Stream<bool> observarOnline(String userId) {
    return _db.collection('users').doc(userId).snapshots().map((s) {
      return s.data()?['isOnline'] == true;
    });
  }

  static Widget indicadorOnline(bool online, {double size = 10}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: online ? const Color(0xFF22C55E) : const Color(0xFF9CA3AF),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          online ? 'Online' : 'Offline',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: online ? const Color(0xFF22C55E) : const Color(0xFF9CA3AF),
          ),
        ),
      ],
    );
  }
}
