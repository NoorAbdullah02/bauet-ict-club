import '../core/config.dart';

String _s(dynamic v) => v == null ? '' : v.toString();
DateTime? _d(dynamic v) => v == null ? null : DateTime.tryParse(v.toString())?.toLocal();
bool _b(dynamic v) => v == true || v == 'true' || v == 't';
int _i(dynamic v) => v is int ? v : (v is num ? v.toInt() : int.tryParse(_s(v)) ?? 0);

class EventItem {
  EventItem.fromJson(Map<String, dynamic> j)
      : id = _i(j['id']),
        title = _s(j['title']),
        date = _d(j['date']),
        time = _s(j['time']),
        location = _s(j['location']),
        description = _s(j['description']),
        imageUrl = AppConfig.resolve(_s(j['image_url'])),
        featured = _b(j['featured']),
        category = _s(j['category']);

  final int id;
  final String title;
  final DateTime? date;
  final String time;
  final String location;
  final String description;
  final String imageUrl;
  final bool featured;
  final String category;

  bool get isUpcoming {
    if (date == null) return false;
    final now = DateTime.now();
    return !DateTime(date!.year, date!.month, date!.day).isBefore(DateTime(now.year, now.month, now.day));
  }
}

class NoticeItem {
  NoticeItem.fromJson(Map<String, dynamic> j)
      : id = _i(j['id']),
        title = _s(j['title']),
        date = _d(j['date']),
        content = _s(j['content']),
        priority = _s(j['priority']).isEmpty ? 'normal' : _s(j['priority']),
        pinned = _b(j['pinned']),
        expiry = _d(j['expiry_date']);

  final int id;
  final String title;
  final DateTime? date;
  final String content;
  final String priority;
  final bool pinned;
  final DateTime? expiry;

  bool get expired => expiry != null && expiry!.isBefore(DateTime.now().subtract(const Duration(days: 1)));
}

class Member {
  Member.fromJson(Map<String, dynamic> j)
      : id = _i(j['id']),
        name = _s(j['name']),
        position = _s(j['position']),
        department = _s(j['department']),
        batch = _s(j['batch']),
        session = _s(j['committee_session']),
        imageUrl = AppConfig.resolve(_s(j['image_url'])),
        order = _i(j['display_order']),
        fb = _s(j['social_fb']),
        gh = _s(j['social_gh']),
        li = _s(j['social_li']);

  final int id;
  final String name;
  final String position;
  final String department;
  final String batch;
  final String session;
  final String imageUrl;
  final int order;
  final String fb;
  final String gh;
  final String li;

  bool get isLeader {
    final p = position.toLowerCase().trim();
    return p == 'president' || p.startsWith('vice president');
  }

  bool get isChief => position.toLowerCase().trim().startsWith('chief executive');

  bool get isExecutive => position.toLowerCase().trim().startsWith('executive');

  bool get isCore => !isLeader && !isChief && !isExecutive;
}

class GalleryItem {
  GalleryItem.fromJson(Map<String, dynamic> j)
      : id = _i(j['id']),
        title = _s(j['title']),
        imageUrl = AppConfig.resolve(_s(j['image_url'])),
        category = _s(j['category']),
        date = _d(j['date']),
        description = _s(j['description']);

  final int id;
  final String title;
  final String imageUrl;
  final String category;
  final DateTime? date;
  final String description;
}

class Achievement {
  Achievement.fromJson(Map<String, dynamic> j)
      : id = _i(j['id']),
        title = _s(j['title']),
        date = _d(j['date']),
        description = _s(j['description']),
        icon = _s(j['icon']);

  final int id;
  final String title;
  final DateTime? date;
  final String description;
  final String icon;
}

class SiteSettings {
  const SiteSettings({
    this.aboutText = '',
    this.mission = '',
    this.vision = '',
    this.goal = '',
    this.fb = '',
    this.email = '',
    this.phone = '',
  });

  factory SiteSettings.fromJson(Map<String, dynamic> j) {
    final social = j['socialLinks'] is Map ? Map<String, dynamic>.from(j['socialLinks'] as Map) : <String, dynamic>{};
    return SiteSettings(
      aboutText: _s(j['aboutText']),
      mission: _s(j['mission']),
      vision: _s(j['vision']),
      goal: _s(j['goal']),
      fb: _s(social['fb']),
      email: _s(social['email']),
      phone: _s(social['phone']),
    );
  }

  final String aboutText;
  final String mission;
  final String vision;
  final String goal;
  final String fb;
  final String email;
  final String phone;
}

class Registration {
  Registration.fromJson(Map<String, dynamic> j)
      : id = _i(j['id']),
        type = _s(j['type']),
        fullName = _s(j['full_name']),
        studentId = _s(j['student_id']),
        batch = _s(j['batch']),
        department = _s(j['department']),
        phone = _s(j['phone']),
        email = _s(j['email']),
        gender = _s(j['gender']),
        post = _s(j['post']),
        interests = j['interests'] is List ? (j['interests'] as List).map((e) => e.toString()).toList() : <String>[],
        experience = _s(j['experience']),
        note = _s(j['note']),
        photoUrl = AppConfig.resolve(_s(j['photo_url'])),
        status = _s(j['status']).isEmpty ? 'pending' : _s(j['status']),
        createdAt = _d(j['created_at']);

  final int id;
  final String type;
  final String fullName;
  final String studentId;
  final String batch;
  final String department;
  final String phone;
  final String email;
  final String gender;
  final String post;
  final List<String> interests;
  final String experience;
  final String note;
  final String photoUrl;
  String status;
  final DateTime? createdAt;
}

class ChatMessage {
  ChatMessage(this.role, this.content);
  final String role; // 'user' | 'assistant'
  final String content;
  bool get isUser => role == 'user';
}
