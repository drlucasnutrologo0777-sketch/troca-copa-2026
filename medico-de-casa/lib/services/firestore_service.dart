import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:uuid/uuid.dart';

import '../models/caregiver_document.dart';
import '../models/user_profile.dart';
import '../firebase_options.dart';
import 'cep_service.dart';
import 'local_demo_store.dart';

class FirestoreService {
  FirestoreService({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;
  final _uuid = const Uuid();
  final _demo = LocalDemoStore.instance;

  bool get _demoMode => !DefaultFirebaseOptions.configured || Firebase.apps.isEmpty;

  Future<void> saveCaregiverProfile({
    required String uid,
    required Map<String, dynamic> data,
  }) async {
    if (_demoMode) {
      await _demo.saveCaregiver(uid, {...data, 'approved': false});
      return;
    }
    await _db.collection('caregivers').doc(uid).set(
      {...data, 'approved': false, 'updatedAt': FieldValue.serverTimestamp()},
      SetOptions(merge: true),
    );
  }

  Future<void> saveClientProfile({
    required String uid,
    required Map<String, dynamic> data,
  }) async {
    if (_demoMode) {
      await _demo.saveClient(uid, data);
      return;
    }
    await _db.collection('clients').doc(uid).set(
      {...data, 'updatedAt': FieldValue.serverTimestamp()},
      SetOptions(merge: true),
    );
  }

  Future<void> savePatient({
    required String clientId,
    required Map<String, dynamic> data,
  }) async {
    if (_demoMode) return;
    final id = _uuid.v4();
    await _db.collection('patients').doc(id).set({
      ...data,
      'clientRef': _db.collection('clients').doc(clientId),
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  Stream<List<CaregiverProfile>> approvedCaregivers() {
    if (_demoMode) {
      return Stream.periodic(const Duration(seconds: 1)).asyncMap((_) async {
        final list = await _demo.approvedCaregivers();
        return list
            .map((e) => CaregiverProfile.fromMap(e['uid'] as String, Map<String, dynamic>.from(e)))
            .toList();
      });
    }
    return _db
        .collection('caregivers')
        .where('approved', isEqualTo: true)
        .snapshots()
        .map((snap) => snap.docs.map((d) => CaregiverProfile.fromMap(d.id, d.data())).toList());
  }

  Future<CaregiverProfile?> getCaregiver(String uid) async {
    if (_demoMode) {
      final data = await _demo.getCaregiver(uid);
      if (data == null) return null;
      return CaregiverProfile.fromMap(uid, Map<String, dynamic>.from(data));
    }
    final snap = await _db.collection('caregivers').doc(uid).get();
    if (!snap.exists) return null;
    return CaregiverProfile.fromMap(uid, snap.data()!);
  }

  Future<Map<String, dynamic>?> getCaregiverData(String uid) async {
    if (_demoMode) return _demo.getCaregiver(uid);
    final snap = await _db.collection('caregivers').doc(uid).get();
    return snap.data();
  }

  Future<bool> hasCaregiverProfile(String uid) async {
    if (_demoMode) return _demo.hasCaregiver(uid);
    final snap = await _db.collection('caregivers').doc(uid).get();
    if (!snap.exists) return false;
    final cep = snap.data()?['cep'] as String? ?? '';
    return CepService.digitsOnly(cep).length == 8;
  }

  Future<bool> hasClientProfile(String uid) async {
    if (_demoMode) return _demo.hasClient(uid);
    final snap = await _db.collection('clients').doc(uid).get();
    if (!snap.exists) return false;
    final cep = snap.data()?['cep'] as String? ?? '';
    return CepService.digitsOnly(cep).length == 8;
  }

  Stream<Map<String, dynamic>?> caregiverDataStream(String uid) {
    if (_demoMode) {
      return Stream.periodic(const Duration(seconds: 1)).asyncMap((_) => _demo.getCaregiver(uid));
    }
    return _db.collection('caregivers').doc(uid).snapshots().map((s) => s.data());
  }

  Stream<List<Map<String, dynamic>>> userChatsDemo(String uid) {
    return Stream.periodic(const Duration(seconds: 1)).asyncMap((_) => _demo.userChats(uid));
  }

  Stream<List<QueryDocumentSnapshot<Map<String, dynamic>>>> userChats(String uid) {
    if (_demoMode) {
      throw UnsupportedError('Use userChatsDemo in demo mode');
    }
    return _db
        .collection('chats')
        .where('participants', arrayContains: uid)
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map((s) => s.docs);
  }

  Future<List<CaregiverDocument>> getCaregiverDocuments(String caregiverId) async {
    if (_demoMode) return [];
    final snap = await _db
        .collection('caregivers')
        .doc(caregiverId)
        .collection('documents')
        .where('status', isEqualTo: 'approved')
        .get();
    return snap.docs.map((d) => CaregiverDocument.fromMap(d.id, d.data())).toList();
  }

  Future<void> openCaregiverProfileForFamily({
    required String caregiverId,
    required String familyId,
  }) async {
    if (_demoMode) return;
    await _db.collection('caregiver_profile_views').add({
      'caregiverId': caregiverId,
      'familyId': familyId,
      'curriculumAutoRequested': true,
      'viewedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<String> requestContact({
    required String caregiverId,
    required String familyId,
  }) async {
    if (_demoMode) {
      return _demo.requestContact(caregiverId: caregiverId, familyId: familyId);
    }
    final chatId = _uuid.v4();
    await _db.collection('chats').doc(chatId).set({
      'participants': [caregiverId, familyId],
      'caregiverId': caregiverId,
      'familyId': familyId,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
      'lastMessage': 'Solicitação de contato enviada',
    });
    await _db.collection('matches').doc(chatId).set({
      'caregiverId': caregiverId,
      'familyId': familyId,
      'chatId': chatId,
      'status': 'contact_requested',
      'createdAt': FieldValue.serverTimestamp(),
    });
    return chatId;
  }

  Stream<List<Map<String, dynamic>>> pendingCaregiversDemo() {
    return Stream.periodic(const Duration(seconds: 1)).asyncMap((_) => _demo.pendingCaregivers());
  }

  Stream<List<QueryDocumentSnapshot<Map<String, dynamic>>>> pendingCaregivers() {
    if (_demoMode) throw UnsupportedError('Use pendingCaregiversDemo');
    return _db
        .collection('caregivers')
        .where('approved', isEqualTo: false)
        .snapshots()
        .map((s) => s.docs);
  }

  Future<void> approveCaregiver(String uid, bool approved) async {
    if (_demoMode) {
      await _demo.setCaregiverApproved(uid, approved);
      return;
    }
    await _db.collection('caregivers').doc(uid).update({
      'approved': approved,
      'reviewedAt': FieldValue.serverTimestamp(),
    });
  }

  Stream<List<Map<String, dynamic>>> chatMessagesDemo(String chatId) {
    return Stream.periodic(const Duration(milliseconds: 800)).asyncMap((_) => _demo.chatMessages(chatId));
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> chatMessages(String chatId) {
    return _db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots();
  }

  Future<void> sendMessage({
    required String chatId,
    required String text,
    String? senderId,
  }) async {
    final uid = senderId ?? FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    if (_demoMode) {
      await _demo.sendMessage(chatId: chatId, senderId: uid, text: text);
      return;
    }
    await _db.collection('chats').doc(chatId).collection('messages').add({
      'senderId': uid,
      'text': text.trim(),
      'createdAt': FieldValue.serverTimestamp(),
    });
    await _db.collection('chats').doc(chatId).update({
      'lastMessage': text.trim(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}
