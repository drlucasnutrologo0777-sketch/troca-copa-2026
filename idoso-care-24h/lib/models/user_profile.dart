enum UserRole { caregiver, family, admin }

class UserProfile {
  const UserProfile({
    required this.uid,
    required this.email,
    required this.fullName,
    required this.role,
    this.phone,
    this.photoUrl,
    this.status = 'active',
    this.verified = false,
  });

  final String uid;
  final String email;
  final String fullName;
  final UserRole role;
  final String? phone;
  final String? photoUrl;
  final String status;
  final bool verified;

  factory UserProfile.fromMap(String uid, Map<String, dynamic> data) {
    return UserProfile(
      uid: uid,
      email: data['email'] as String? ?? '',
      fullName: data['fullName'] as String? ?? '',
      role: _roleFromString(data['role'] as String?),
      phone: data['phone'] as String?,
      photoUrl: data['photoUrl'] as String?,
      status: data['status'] as String? ?? 'active',
      verified: data['verified'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toMap() => {
        'email': email,
        'fullName': fullName,
        'role': role.name,
        'phone': phone,
        'photoUrl': photoUrl,
        'status': status,
        'verified': verified,
        'createdAt': DateTime.now().toIso8601String(),
      };

  static UserRole _roleFromString(String? value) {
    switch (value) {
      case 'caregiver':
        return UserRole.caregiver;
      case 'family':
        return UserRole.family;
      case 'admin':
        return UserRole.admin;
      default:
        return UserRole.family;
    }
  }
}

class CaregiverProfile {
  const CaregiverProfile({
    required this.uid,
    required this.fullName,
    this.bio,
    this.specialties = const [],
    this.hourRate,
    this.dailyRate,
    this.approved = false,
    this.rating = 0,
    this.reviewCount = 0,
    this.city,
    this.photoUrl,
  });

  final String uid;
  final String fullName;
  final String? bio;
  final List<String> specialties;
  final double? hourRate;
  final double? dailyRate;
  final bool approved;
  final double rating;
  final int reviewCount;
  final String? city;
  final String? photoUrl;

  factory CaregiverProfile.fromMap(String uid, Map<String, dynamic> data) {
    return CaregiverProfile(
      uid: uid,
      fullName: data['fullName'] as String? ?? 'Cuidador',
      bio: data['bio'] as String?,
      specialties: List<String>.from(data['specialties'] as List? ?? []),
      hourRate: (data['hourRate'] as num?)?.toDouble(),
      dailyRate: (data['dailyRate'] as num?)?.toDouble(),
      approved: data['approved'] as bool? ?? false,
      rating: (data['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: data['reviewCount'] as int? ?? 0,
      city: data['city'] as String?,
      photoUrl: data['photoUrl'] as String?,
    );
  }
}
