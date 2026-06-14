// Firebase — projeto TROCA COPA 2026 (troca-figurinha-53393)
// NÃO usar no app Da Roça Pra Mesa.
// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        throw UnsupportedError('macOS não configurado.');
      default:
        throw UnsupportedError('Plataforma não suportada.');
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBKSTRZ17o23How-KH-yKbRYGJi3gLUbAA',
    appId: '1:545698991668:web:7003897e82ada9c1180461',
    messagingSenderId: '545698991668',
    projectId: 'troca-figurinha-53393',
    authDomain: 'troca-figurinha-53393.firebaseapp.com',
    storageBucket: 'troca-figurinha-53393.firebasestorage.app',
    measurementId: 'G-5D58J9RYZ2',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAa7zwvY-y95j04FQ9EqfOD3G3fe3dRVCE',
    appId: '1:545698991668:android:b6c05e610d602df3180461',
    messagingSenderId: '545698991668',
    projectId: 'troca-figurinha-53393',
    storageBucket: 'troca-figurinha-53393.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyACjKmxiDYc1inEOggTKfYfNhjSLLtCJWI',
    appId: '1:545698991668:ios:9d582a91895180da180461',
    messagingSenderId: '545698991668',
    projectId: 'troca-figurinha-53393',
    storageBucket: 'troca-figurinha-53393.firebasestorage.app',
    iosBundleId: 'com.mycompany.trocafigurinha',
  );
}
