import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../firebase_options.dart';
import '../models/user_profile.dart';
import 'local_demo_store.dart';

class AuthService extends ChangeNotifier {
  AuthService({FirebaseAuth? auth, FirebaseFirestore? firestore})
      : _auth = auth ?? FirebaseAuth.instance,
        _firestore = firestore ?? FirebaseFirestore.instance {
    if (!useDemoMode) {
      _auth.authStateChanges().listen((_) => loadProfile());
    }
  }

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  final _demo = LocalDemoStore.instance;

  UserProfile? _profile;
  String? _demoUid;

  bool get useDemoMode => !DefaultFirebaseOptions.configured || Firebase.apps.isEmpty;
  User? get firebaseUser => useDemoMode ? null : _auth.currentUser;
  UserProfile? get profile => _profile;
  bool get isSignedIn => useDemoMode ? _demoUid != null : _auth.currentUser != null;

  Future<void> loadProfile() async {
    if (useDemoMode) {
      _demoUid = await _demo.currentUid();
      if (_demoUid == null) {
        _profile = null;
        notifyListeners();
        return;
      }
      final data = await _demo.getUser(_demoUid!);
      if (data != null) {
        _profile = UserProfile.fromMap(_demoUid!, Map<String, dynamic>.from(data));
      } else {
        _profile = null;
        _demoUid = null;
      }
      notifyListeners();
      return;
    }

    final user = _auth.currentUser;
    if (user == null) {
      _profile = null;
      notifyListeners();
      return;
    }
    try {
      final snap = await _firestore.collection('users').doc(user.uid).get().timeout(
            const Duration(seconds: 8),
          );
      if (snap.exists) {
        _profile = UserProfile.fromMap(user.uid, snap.data()!);
      } else {
        _profile = null;
      }
    } catch (_) {
      _profile = null;
    }
    notifyListeners();
  }

  Future<void> signIn(String email, String password) async {
    if (useDemoMode) {
      final uid = await _demo.signIn(email: email, password: password);
      _demoUid = uid;
      await loadProfile();
      return;
    }
    await _auth.signInWithEmailAndPassword(email: email.trim(), password: password);
    await loadProfile();
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
    required UserRole role,
    String? phone,
  }) async {
    if (useDemoMode) {
      final uid = await _demo.createUser(
        email: email,
        password: password,
        fullName: fullName,
        role: role.name,
        phone: phone,
      );
      _demoUid = uid;
      await loadProfile();
      return;
    }
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final uid = cred.user!.uid;
    final data = UserProfile(
      uid: uid,
      email: email.trim(),
      fullName: fullName.trim(),
      role: role,
      phone: phone?.trim(),
    ).toMap();
    await _firestore.collection('users').doc(uid).set({
      ...data,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
    await loadProfile();
  }

  Future<void> saveRole(UserRole role) async {
    if (useDemoMode) {
      final uid = _demoUid;
      if (uid == null) return;
      await _demo.updateUser(uid, {'role': role.name});
      await loadProfile();
      return;
    }
    final user = _auth.currentUser;
    if (user == null) return;
    await _firestore.collection('users').doc(user.uid).set(
      {'role': role.name},
      SetOptions(merge: true),
    );
    await loadProfile();
  }

  Future<void> signOut() async {
    if (useDemoMode) {
      await _demo.signOut();
      _demoUid = null;
      _profile = null;
      notifyListeners();
      return;
    }
    await _auth.signOut();
    _profile = null;
    notifyListeners();
  }

  String? get currentUid => useDemoMode ? _demoUid : _auth.currentUser?.uid;
}
