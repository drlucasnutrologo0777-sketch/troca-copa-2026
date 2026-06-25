import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Armazenamento local quando Firebase ainda não está configurado.
class LocalDemoStore {
  LocalDemoStore._();
  static final instance = LocalDemoStore._();

  static const _usersKey = 'ic24_demo_users';
  static const _sessionKey = 'ic24_demo_session';
  static const _caregiversKey = 'ic24_demo_caregivers';
  static const _clientsKey = 'ic24_demo_clients';
  static const _chatsKey = 'ic24_demo_chats';

  Future<List<Map<String, dynamic>>> _readList(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return [];
    return List<Map<String, dynamic>>.from(jsonDecode(raw) as List);
  }

  Future<void> _writeList(String key, List<Map<String, dynamic>> list) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(list));
  }

  Future<String?> currentUid() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_sessionKey);
  }

  Future<void> setSession(String? uid) async {
    final prefs = await SharedPreferences.getInstance();
    if (uid == null) {
      await prefs.remove(_sessionKey);
    } else {
      await prefs.setString(_sessionKey, uid);
    }
  }

  Future<Map<String, dynamic>?> findUserByEmail(String email) async {
    final users = await _readList(_usersKey);
    final lower = email.trim().toLowerCase();
    for (final u in users) {
      if ((u['email'] as String? ?? '').toLowerCase() == lower) return u;
    }
    return null;
  }

  Future<Map<String, dynamic>?> getUser(String uid) async {
    final users = await _readList(_usersKey);
    for (final u in users) {
      if (u['uid'] == uid) return u;
    }
    return null;
  }

  Future<String> createUser({
    required String email,
    required String password,
    required String fullName,
    required String role,
    String? phone,
  }) async {
    final users = await _readList(_usersKey);
    final lower = email.trim().toLowerCase();
    if (users.any((u) => (u['email'] as String? ?? '').toLowerCase() == lower)) {
      throw StateError('E-mail já cadastrado');
    }
    final uid = 'demo_${DateTime.now().millisecondsSinceEpoch}';
    users.add({
      'uid': uid,
      'email': lower,
      'password': password,
      'fullName': fullName.trim(),
      'role': role,
      'phone': phone,
      'status': 'active',
      'verified': false,
    });
    await _writeList(_usersKey, users);
    await setSession(uid);
    return uid;
  }

  Future<String> signIn({required String email, required String password}) async {
    final user = await findUserByEmail(email);
    if (user == null || user['password'] != password) {
      throw StateError('E-mail ou senha inválidos');
    }
    final uid = user['uid'] as String;
    await setSession(uid);
    return uid;
  }

  Future<void> signOut() => setSession(null);

  Future<void> saveCaregiver(String uid, Map<String, dynamic> data) async {
    final list = await _readList(_caregiversKey);
    list.removeWhere((e) => e['uid'] == uid);
    list.add({'uid': uid, ...data});
    await _writeList(_caregiversKey, list);
  }

  Future<Map<String, dynamic>?> getCaregiver(String uid) async {
    final list = await _readList(_caregiversKey);
    for (final e in list) {
      if (e['uid'] == uid) return e;
    }
    return null;
  }

  Future<bool> hasCaregiver(String uid) async {
    final c = await getCaregiver(uid);
    if (c == null) return false;
    final cep = (c['cep'] as String? ?? '').replaceAll(RegExp(r'\D'), '');
    return cep.length == 8;
  }

  Future<void> saveClient(String uid, Map<String, dynamic> data) async {
    final list = await _readList(_clientsKey);
    list.removeWhere((e) => e['uid'] == uid);
    list.add({'uid': uid, ...data});
    await _writeList(_clientsKey, list);
  }

  Future<bool> hasClient(String uid) async {
    final list = await _readList(_clientsKey);
    for (final e in list) {
      if (e['uid'] == uid) {
        final cep = (e['cep'] as String? ?? '').replaceAll(RegExp(r'\D'), '');
        return cep.length == 8;
      }
    }
    return false;
  }

  Future<List<Map<String, dynamic>>> approvedCaregivers() async {
    final list = await _readList(_caregiversKey);
    return list.where((e) => e['approved'] == true).toList();
  }

  Future<List<Map<String, dynamic>>> pendingCaregivers() async {
    final list = await _readList(_caregiversKey);
    return list.where((e) => e['approved'] != true).toList();
  }

  Future<void> setCaregiverApproved(String uid, bool approved) async {
    final c = await getCaregiver(uid);
    if (c == null) return;
    await saveCaregiver(uid, {...c, 'approved': approved});
  }

  Future<void> updateUser(String uid, Map<String, dynamic> patch) async {
    final users = await _readList(_usersKey);
    for (var i = 0; i < users.length; i++) {
      if (users[i]['uid'] == uid) {
        users[i] = {...users[i], ...patch};
        await _writeList(_usersKey, users);
        return;
      }
    }
  }

  Future<String> requestContact({required String caregiverId, required String familyId}) async {
    final chats = await _readList(_chatsKey);
    final id = 'chat_${DateTime.now().millisecondsSinceEpoch}';
    chats.add({
      'id': id,
      'participants': [caregiverId, familyId],
      'caregiverId': caregiverId,
      'familyId': familyId,
      'lastMessage': 'Solicitação de contato enviada',
      'updatedAt': DateTime.now().toIso8601String(),
      'messages': <Map<String, dynamic>>[],
    });
    await _writeList(_chatsKey, chats);
    return id;
  }

  Future<List<Map<String, dynamic>>> userChats(String uid) async {
    final chats = await _readList(_chatsKey);
    return chats.where((c) {
      final p = List<String>.from(c['participants'] as List? ?? []);
      return p.contains(uid);
    }).toList()
      ..sort((a, b) => (b['updatedAt'] as String? ?? '').compareTo(a['updatedAt'] as String? ?? ''));
  }

  Future<List<Map<String, dynamic>>> chatMessages(String chatId) async {
    final chats = await _readList(_chatsKey);
    for (final c in chats) {
      if (c['id'] == chatId) {
        return List<Map<String, dynamic>>.from(c['messages'] as List? ?? []);
      }
    }
    return [];
  }

  Future<void> sendMessage({required String chatId, required String senderId, required String text}) async {
    final chats = await _readList(_chatsKey);
    for (final c in chats) {
      if (c['id'] == chatId) {
        final messages = List<Map<String, dynamic>>.from(c['messages'] as List? ?? []);
        messages.add({
          'senderId': senderId,
          'text': text,
          'createdAt': DateTime.now().toIso8601String(),
        });
        c['messages'] = messages;
        c['lastMessage'] = text;
        c['updatedAt'] = DateTime.now().toIso8601String();
        break;
      }
    }
    await _writeList(_chatsKey, chats);
  }
}
