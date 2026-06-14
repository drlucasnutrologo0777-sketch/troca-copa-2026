import 'package:firebase_auth/firebase_auth.dart';

String mensagemAuthErro(Object e) {
  if (e is FirebaseAuthException) {
    switch (e.code) {
      case 'invalid-email':
        return 'E-mail inválido.';
      case 'user-disabled':
        return 'Conta desativada.';
      case 'user-not-found':
        return 'Usuário não encontrado.';
      case 'wrong-password':
        return 'Senha incorreta.';
      case 'email-already-in-use':
        return 'Este e-mail já está cadastrado.';
      case 'weak-password':
        return 'Senha muito fraca (mínimo 6 caracteres).';
      case 'invalid-credential':
        return 'E-mail ou senha incorretos.';
      case 'operation-not-allowed':
        return 'Login por e-mail não ativado no Firebase Console.';
      default:
        return e.message ?? 'Erro de autenticação.';
    }
  }
  return e.toString();
}
