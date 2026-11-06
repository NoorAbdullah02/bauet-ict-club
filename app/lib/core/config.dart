/// Central place for environment-specific values.
///
/// Android emulator -> host machine is reachable at 10.0.2.2.
/// Physical device  -> use your PC's LAN IP, e.g. http://192.168.1.20:5000/api
/// You can also override at build time:
///   flutter run --dart-define=API_URL=http://192.168.1.20:5000/api
class AppConfig {
  AppConfig._();

  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );

  static const String clubName = 'BAUET ICT Club';

  /// Server origin without the `/api` suffix (used for relative image paths).
  static String get origin => baseUrl.replaceFirst(RegExp(r'/api/?$'), '');

  /// Turns server-relative paths (`/uploads/x.png`) into absolute URLs.
  static String resolve(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('data:')) return ''; // inline SVG sample pictures cannot be drawn: show the initials instead
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return url.startsWith('/') ? '$origin$url' : '$origin/$url';
  }
}

/// Application posts a committee applicant can pick (mirrors the website).
const List<String> kCommitteePosts = [
  'President',
  'Vice President (Administration)',
  'Vice President (Technical)',
  'General Secretary',
  'Assistant General Secretary',
  'Joint Secretary',
  'Assistant Joint Secretary',
  'Treasurer',
  'Financial Secretary',
  'Organizing Secretary',
  'Publicity Secretary (Outreach & Activation)',
  'Publicity Secretary (Social Media Management)',
  'Office Secretary (Resource Management)',
  'Office Secretary (Event Management)',
  'IT Secretary (Webmaster)',
  'IT Secretary (Design & Creativity)',
  'Executive Member',
  'Executive Member (Logistics)',
  'Executive Member (Cultural Activities)',
  'Executive Member (Social Media Management)',
  'Executive Member (Documentation)',
  'Executive Member (Event Management)',
  'Executive Member (IT & Gaming)',
];

const List<String> kDepartments = ['ICE', 'CSE', 'EEE', 'CE', 'ME', 'Other'];
/// Departments an ambassador can represent.
const List<String> kAmbassadorDepartments = ['ICE', 'CSE', 'EEE', 'CE', 'ME', 'Other'];
const String kAmbassadorPost = 'Department Ambassador';
const List<String> kGenders = ['Male', 'Female', 'Other'];
const List<String> kLevels = ['Beginner', 'Intermediate', 'Advanced'];
const List<String> kInterests = [
  'Web Development',
  'AI & ML',
  'Competitive Programming',
  'Cyber Security',
  'Robotics & IoT',
  'App Development',
  'UI / UX Design',
  'Graphics & Video',
  'Photography',
  'Content Writing',
  'Event Management',
  'Public Speaking',
];
const int kMaxInterests = 8;

/// Member form choices (admin).
const List<String> kMemberDepartments = ['ICE', 'CSE', 'EEE', 'CE', 'ME', 'BBA', 'LLB', 'ELL'];

/// "6th" .. "29th"
const List<String> kBatchOrdinals = [
  '6th', '7th', '8th', '9th', '10th', '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th', '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th',
];
