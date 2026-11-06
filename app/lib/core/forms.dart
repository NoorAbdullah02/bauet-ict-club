// Event / public form questions (built by the admin like a Google Form). Same rules as client/src/lib/forms.js;
// the server checks every answer again.

typedef Q = Map<String, dynamic>;

const String kOther = 'Other: ';
const List<String> kBatchList = ['12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'];
const List<String> kDeptList = ['ICE', 'CSE', 'EEE', 'CE', 'ME', 'BBA', 'LLB', 'ELL', 'Other'];

final List<Q> kDefaultFields = [
  {'id': 'name', 'key': 'name', 'type': 'short', 'label': 'Full name', 'required': true},
  {'id': 'student_id', 'key': 'student_id', 'type': 'short', 'label': 'Student ID', 'required': true},
  {'id': 'batch', 'key': 'batch', 'type': 'dropdown', 'label': 'Batch', 'required': false, 'options': kBatchList},
  {'id': 'department', 'key': 'department', 'type': 'dropdown', 'label': 'Department', 'required': false, 'options': kDeptList},
  {'id': 'email', 'key': 'email', 'type': 'email', 'label': 'Email', 'required': true},
  {'id': 'phone', 'key': 'phone', 'type': 'phone', 'label': 'Mobile (optional)', 'required': false},
];

/// The questions of an event or form (`reg_form`), or the standard six when none were built.
List<Q> fieldsOfForm(Map<String, dynamic> regForm) {
  final f = regForm['fields'];
  if (f is List && f.isNotEmpty) return f.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  return kDefaultFields;
}

String qType(Q f) => (f['type'] ?? 'short').toString();
String qLabel(Q f) => (f['label'] ?? '').toString();
String qId(Q f) => (f['id'] ?? '').toString();
bool qRequired(Q f) => f['required'] == true;
List<String> qOptions(Q f) => f['options'] is List ? (f['options'] as List).map((e) => e.toString()).toList() : <String>[];
bool isOtherValue(dynamic x) => x is String && x.startsWith(kOther);

/// An answer that counts as "nothing entered" (including an "Other:" with no text).
bool isBlank(dynamic v) {
  if (v == null) return true;
  if (v is String) return v.isEmpty || v == kOther;
  if (v is List) return v.isEmpty || v.every((x) => x == kOther);
  return false;
}

String showValue(dynamic v) => v is List ? v.join(', ') : (v ?? '').toString();

/// Conditional questions: shown only when an earlier question has the chosen answer.
bool isVisibleQ(Q f, Map<String, dynamic> values) {
  final c = f['showIf'];
  if (c is! Map) return true;
  final got = values[(c['field'] ?? '').toString()];
  final want = (c['equals'] ?? '').toString();
  return got is List ? got.contains(want) : (got ?? '').toString() == want;
}

/// Splits the questions into pages at every heading marked "starts a new page".
List<List<Q>> pagesOfForm(List<Q> fields) {
  final pages = <List<Q>>[[]];
  for (var i = 0; i < fields.length; i++) {
    final f = fields[i];
    if (qType(f) == 'section' && f['page'] == true && i > 0 && pages.last.isNotEmpty) pages.add([]);
    pages.last.add(f);
  }
  return pages;
}

num? _num(dynamic v) => v is num ? v : num.tryParse((v ?? '').toString());

/// The answer rules of one question checked on the person's screen. Returns a message or ''.
String ruleProblem(Q f, dynamic v) {
  if (isBlank(v)) return '';
  final t = qType(f);
  if (t == 'short' && (f['pattern'] ?? '').toString().isNotEmpty) {
    try {
      if (!RegExp(f['pattern'].toString()).hasMatch(v.toString())) {
        final m = (f['patternMsg'] ?? '').toString();
        return m.isEmpty ? 'This does not look right' : m;
      }
    } catch (_) {
      // bad pattern: the server decides
    }
  }
  if (t == 'short' || t == 'long') {
    final n = v.toString().length;
    final lo = _num(f['minLen']);
    final hi = _num(f['maxLen']);
    if (lo != null && lo > 0 && n < lo) return 'Write at least ${lo.toInt()} characters';
    if (hi != null && hi > 0 && n > hi) return 'Write at most ${hi.toInt()} characters';
  }
  if (t == 'number') {
    final n = _num(v);
    if (n == null) return 'Enter a number';
    if (f['whole'] == true && n != n.truncate()) return 'Enter a whole number';
    final lo = _num(f['min']);
    final hi = _num(f['max']);
    if (lo != null && n < lo) return 'Must be at least $lo';
    if (hi != null && n > hi) return 'Must be at most $hi';
  }
  if (t == 'checkbox' && v is List) {
    final lo = _num(f['minSel']);
    final hi = _num(f['maxSel']);
    if (lo != null && lo > 0 && v.length < lo) return 'Choose at least ${lo.toInt()}';
    if (hi != null && hi > 0 && v.length > hi) return 'Choose at most ${hi.toInt()}';
  }
  return '';
}

/// Checks the visible questions on one page. Returns {fieldId: message}.
Map<String, String> problemsOf(List<Q> fields, Map<String, dynamic> values) {
  final err = <String, String>{};
  for (final f in fields) {
    if (qType(f) == 'section' || !isVisibleQ(f, values)) continue;
    final id = qId(f);
    if (qRequired(f) && isBlank(values[id])) {
      err[id] = 'This question is required';
    } else {
      final m = ruleProblem(f, values[id]);
      if (m.isNotEmpty) err[id] = m;
    }
  }
  return err;
}

/// The answers to send: visible questions only, nothing empty.
Map<String, dynamic> answersToSend(List<Q> fields, Map<String, dynamic> values) {
  final out = <String, dynamic>{};
  for (final f in fields) {
    if (qType(f) == 'section' || !isVisibleQ(f, values)) continue;
    final v = values[qId(f)];
    if (!isBlank(v)) out[qId(f)] = v;
  }
  return out;
}

/// A ticket code the way people read it: groups of four.
String prettyCode(String code) {
  final c = code.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase();
  final parts = <String>[];
  for (var i = 0; i < c.length; i += 4) {
    parts.add(c.substring(i, i + 4 > c.length ? c.length : i + 4));
  }
  return parts.join(' ');
}

/// Pulls a ticket code or a form slug out of something a person pasted (a link or a bare code).
({String kind, String value})? parseOpenable(String raw) {
  final t = raw.trim();
  if (t.isEmpty) return null;
  final ticket = RegExp(r'/ticket/([A-Za-z0-9\- ]+)').firstMatch(t);
  if (ticket != null) return (kind: 'ticket', value: ticket.group(1)!.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase());
  final verify = RegExp(r'/(?:verify|certificate)/([A-Za-z0-9\- ]+)').firstMatch(t);
  if (verify != null) return (kind: 'verify', value: verify.group(1)!.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase());
  final form = RegExp(r'/f/([A-Za-z0-9_\-]+)').firstMatch(t);
  if (form != null) return (kind: 'form', value: form.group(1)!);
  final ev = RegExp(r'/events/(\d+)').firstMatch(t);
  if (ev != null) return (kind: 'event', value: ev.group(1)!);
  final bare = t.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase();
  if (bare.length >= 8) return (kind: 'ticket', value: bare);
  return null;
}
