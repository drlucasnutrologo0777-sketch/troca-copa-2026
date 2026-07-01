// Firebase — projeto IDOSO CARE 24H (baba-on)
// Substitua com: dart pub global activate flutterfire_cli && flutterfire configure
// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static const bool configured = true;

  static FirebaseOptions get currentPlatform {
    if (!configured) {
      throw UnsupportedError(
        'Firebase não configurado. Rode flutterfire configure --project=baba-on '
        'na pasta baba_on_app e baixe google-services.json + GoogleService-Info.plist.',
      );
    }
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError('Plataforma não suportada.');
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyANP5NdTT-ZcDm1K5GTzPpfPqVs_PqtDpI',
    appId: '1:361055634294:web:5c887f315c327bf00ef057',
    messagingSenderId: '361055634294',
    projectId: 'baba-on',
    authDomain: 'baba-on.firebaseapp.com',
    databaseURL: 'https://baba-on-default-rtdb.firebaseio.com',
    storageBucket: 'baba-on.firebasestorage.app',
    measurementId: 'G-948BD8M7XC',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBZLyZWYPkXOK4TbvN1ZVEOwHjr2MxPa7E',
    appId: '1:361055634294:android:0b4bef85b8cfd6250ef057',
    messagingSenderId: '361055634294',
    projectId: 'baba-on',
    databaseURL: 'https://baba-on-default-rtdb.firebaseio.com',
    storageBucket: 'baba-on.firebasestorage.app',
  );
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyA3FdlZgCXuEVxF69Hnza8b9rITNNSLsoo',
    appId: '1:361055634294:ios:d09ee7f325a089ce0ef057',
    messagingSenderId: '361055634294',
    projectId: 'baba-on',
    databaseURL: 'https://baba-on-default-rtdb.firebaseio.com',
    storageBucket: 'baba-on.firebasestorage.app',
    androidClientId: '361055634294-t98pnb0pgcllecfe9h37rqg6kiop1a1l.apps.googleusercontent.com',
    iosClientId: '361055634294-cbpov87rr92j4slec3urpb9e3nkn7ell.apps.googleusercontent.com',
    iosBundleId: 'com.babaon.app',
  );
}
