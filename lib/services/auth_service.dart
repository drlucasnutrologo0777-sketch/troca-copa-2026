import 'dart:typed_data';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:geolocator/geolocator.dart';
import '../models/models.dart';
import 'presence_service.dart';

class AuthService {
  AuthService._();
  static final instance = AuthService._();

  final _auth = FirebaseAuth.instance;
  final _db = FirebaseFirestore.instance;
  final _storage = FirebaseStorage.instance;

  Stream<User?> get authState => _auth.authStateChanges();
  User? get currentUser => _auth.currentUser;

  Future<UserProfile?> loginEmail({
    required String email,
    required String senha,
  }) async {
    await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: senha,
    );
    final profile = await carregarPerfil();
    if (profile != null) {
      await _atualizarLocalizacao(profile.id);
      return carregarPerfil();
    }
    return null;
  }

  Future<UserProfile> cadastrar({
    required String nome,
    required String email,
    required String senha,
    required String telefone,
    required String endereco,
    required String cidade,
    required String estado,
    Uint8List? fotoBytes,
    String? fotoNome,
  }) async {
    final emailNorm = email.trim();
    User? user = _auth.currentUser;
    if (user == null || user.email?.trim().toLowerCase() != emailNorm.toLowerCase()) {
      final cred = await _auth.createUserWithEmailAndPassword(
        email: emailNorm,
        password: senha,
      );
      user = cred.user;
    }
    final uid = user!.uid;
    final pos = await _obterLocalizacao();

    final profile = UserProfile(
      id: uid,
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      endereco: endereco.trim(),
      cidade: cidade.trim(),
      estado: estado.trim(),
      latitude: pos.latitude,
      longitude: pos.longitude,
    );

    await _db.collection('users').doc(uid).set({
      ...profile.toMap(),
      'isOnline': false,
      'createdAt': FieldValue.serverTimestamp(),
    });

    await _tentarSalvarFoto(uid, fotoBytes, fotoNome);

    return (await carregarPerfil())!;
  }

  Future<UserProfile> completarCadastro({
    required String nome,
    required String telefone,
    required String endereco,
    required String cidade,
    required String estado,
    Uint8List? fotoBytes,
    String? fotoNome,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw FirebaseAuthException(code: 'no-user', message: 'Faça login primeiro.');
    }
    final uid = user.uid;
    final pos = await _obterLocalizacao();
    final email = user.email ?? '';

    final profile = UserProfile(
      id: uid,
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      endereco: endereco.trim(),
      cidade: cidade.trim(),
      estado: estado.trim(),
      latitude: pos.latitude,
      longitude: pos.longitude,
    );

    await _db.collection('users').doc(uid).set({
      ...profile.toMap(),
      'isOnline': false,
      'updatedAt': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));

    await _tentarSalvarFoto(uid, fotoBytes, fotoNome);

    return (await carregarPerfil())!;
  }

  Future<void> esqueciSenha(String email) async {
    await _auth.sendPasswordResetEmail(email: email.trim());
  }

  Future<UserProfile?> carregarPerfil() async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return null;
    final snap = await _db.collection('users').doc(uid).get();
    if (!snap.exists) return null;
    final d = snap.data()!;
    return UserProfile(
      id: uid,
      nome: d['nome'] as String? ?? '',
      email: d['email'] as String? ?? _auth.currentUser?.email ?? '',
      telefone: d['telefone'] as String? ?? '',
      endereco: d['endereco'] as String? ?? '',
      cidade: d['cidade'] as String? ?? '',
      estado: d['estado'] as String? ?? '',
      latitude: (d['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (d['longitude'] as num?)?.toDouble() ?? 0,
      fotoUrl: d['fotoUrl'] as String?,
      raioTrocaKm: (d['raioTrocaKm'] as num?)?.toDouble() ?? 10,
      isOnline: d['isOnline'] as bool? ?? false,
    );
  }

  Future<void> _atualizarLocalizacao(String uid) async {
    final pos = await _obterLocalizacao();
    await _db.collection('users').doc(uid).update({
      'latitude': pos.latitude,
      'longitude': pos.longitude,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> _tentarSalvarFoto(String uid, Uint8List? fotoBytes, String? fotoNome) async {
    if (fotoBytes == null || fotoBytes.isEmpty) return;
    try {
      final fotoUrl = await _enviarFoto(uid, fotoBytes, fotoNome ?? 'foto.jpg');
      await _db.collection('users').doc(uid).set({
        'fotoUrl': fotoUrl,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (_) {
      // Foto opcional — cadastro conclui mesmo se o upload falhar.
    }
  }

  Future<String> _enviarFoto(String uid, Uint8List bytes, String nome) async {
    final lower = nome.toLowerCase();
    // iPhone envia HEIC; image_picker já converte bytes — sempre salvar como JPEG.
    final ext = lower.endsWith('.png') ? 'png' : 'jpg';
    final contentType = ext == 'png' ? 'image/png' : 'image/jpeg';
    final path = 'users/$uid/profile_${DateTime.now().millisecondsSinceEpoch}.$ext';
    final ref = _storage.ref().child(path);
    await ref.putData(bytes, SettableMetadata(contentType: contentType));
    return ref.getDownloadURL();
  }

  Future<UserProfile> atualizarFoto({
    required Uint8List fotoBytes,
    String? fotoNome,
  }) async {
    final uid = _auth.currentUser!.uid;
    final fotoUrl = await _enviarFoto(uid, fotoBytes, fotoNome ?? 'foto.jpg');
    await _db.collection('users').doc(uid).set({
      'fotoUrl': fotoUrl,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
    return (await carregarPerfil())!;
  }

  Future<void> sair() async {
    await PresenceService.instance.ficarOffline();
    await _auth.signOut();
  }

  Future<UserProfile> atualizarPreferenciasTroca({
    required String cidade,
    required String estado,
    required double raioKm,
  }) async {
    final uid = _auth.currentUser!.uid;
    final pos = await _obterLocalizacao();
    await _db.collection('users').doc(uid).update({
      'cidade': cidade.trim(),
      'estado': estado.trim(),
      'raioTrocaKm': raioKm,
      'latitude': pos.latitude,
      'longitude': pos.longitude,
      'updatedAt': FieldValue.serverTimestamp(),
    });
    return (await carregarPerfil())!;
  }

  Future<void> apagarConta({required String senha}) async {
    final user = _auth.currentUser;
    if (user == null) return;
    final uid = user.uid;
    final email = user.email;
    if (email == null || email.isEmpty) {
      throw FirebaseAuthException(code: 'no-email', message: 'Conta sem e-mail não pode ser apagada pelo app.');
    }

    await user.reauthenticateWithCredential(
      EmailAuthProvider.credential(email: email, password: senha),
    );

    await PresenceService.instance.ficarOffline();

    await _db.collection('offers').doc(uid).delete().catchError((_) {});

    final unlocked = await _db.collection('users').doc(uid).collection('unlockedMatches').get();
    for (final doc in unlocked.docs) {
      await doc.reference.delete();
    }

    final decisions = await _db
        .collection('matchDecisions')
        .where('fromUserId', isEqualTo: uid)
        .get();
    for (final doc in decisions.docs) {
      await doc.reference.delete();
    }

    final payments = await _db.collection('payments').where('userId', isEqualTo: uid).get();
    for (final doc in payments.docs) {
      await doc.reference.delete();
    }

    await _anonymizarMatchesDoUsuario(uid);

    await _db.collection('users').doc(uid).delete();

    try {
      final folder = _storage.ref().child('users/$uid');
      final list = await folder.listAll();
      for (final item in list.items) {
        await item.delete();
      }
    } catch (_) {}

    await user.delete();
    await _auth.signOut();
  }

  Future<void> _anonymizarMatchesDoUsuario(String uid) async {
    final comoA = await _db.collection('mutualMatches').where('userA', isEqualTo: uid).get();
    final comoB = await _db.collection('mutualMatches').where('userB', isEqualTo: uid).get();
    for (final doc in [...comoA.docs, ...comoB.docs]) {
      final data = doc.data();
      final updates = <String, dynamic>{};
      if (data['userA'] == uid) {
        updates['userAName'] = 'Usuário removido';
        updates['paidUserA'] = false;
        updates['concluidoUserA'] = false;
      }
      if (data['userB'] == uid) {
        updates['userBName'] = 'Usuário removido';
        updates['paidUserB'] = false;
        updates['concluidoUserB'] = false;
      }
      if (updates.isNotEmpty) {
        await doc.reference.update(updates);
      }
    }
  }

  Future<Position> _obterLocalizacao() async {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever ||
        perm == LocationPermission.denied) {
      return Position(
        latitude: -16.735,
        longitude: -43.861,
        timestamp: DateTime.now(),
        accuracy: 0,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
      );
    }
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          timeLimit: Duration(seconds: 8),
        ),
      );
    } catch (_) {
      return Position(
        latitude: -16.735,
        longitude: -43.861,
        timestamp: DateTime.now(),
        accuracy: 0,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
      );
    }
  }
}
