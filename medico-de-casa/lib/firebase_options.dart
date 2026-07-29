// Firebase — projeto medico-de-casa (Web app configurado)
// Android/iOS: rode flutterfire configure --project=medico-de-casa
// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static const bool configured = true;

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        if (!androidConfigured) {
          throw UnsupportedError(
            'Firebase Android: rode flutterfire configure --project=medico-de-casa',
          );
        }
        return android;
      case TargetPlatform.iOS:
        if (!iosConfigured) {
          throw UnsupportedError(
            'Firebase iOS: rode flutterfire configure --project=medico-de-casa',
          );
        }
        return ios;
      default:
        throw UnsupportedError('Plataforma não suportada.');
    }
  }

  static const bool androidConfigured = false;
  static const bool iosConfigured = false;

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyC_qlKNl_FzY0Q8LSiLLLmxYHzafye0Ul4',
    appId: '1:1022133340311:web:02d1f7be36e7404329c1d2',
    messagingSenderId: '1022133340311',
    projectId: 'medico-de-casa',
    authDomain: 'medico-de-casa.firebaseapp.com',
    storageBucket: 'medico-de-casa.firebasestorage.app',
    measurementId: 'G-YCDMW0RPJH',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'SUBSTITUA',
    appId: 'SUBSTITUA',
    messagingSenderId: '1022133340311',
    projectId: 'medico-de-casa',
    storageBucket: 'medico-de-casa.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'SUBSTITUA',
    appId: 'SUBSTITUA',
    messagingSenderId: '1022133340311',
    projectId: 'medico-de-casa',
    storageBucket: 'medico-de-casa.firebasestorage.app',
    iosBundleId: 'com.medicodecasa.app',
  );
}
