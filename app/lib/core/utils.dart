import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String monthShort(DateTime d) => _months[d.month - 1];

String fmtDate(DateTime? d) => d == null ? '' : '${d.day} ${monthShort(d)} ${d.year}';

/// Rank used to sort committee sessions: year*2 + (winter ? 1 : 0). Higher = newer.
int sessionRank(String s) {
  final m = RegExp(r'(\d{4})').firstMatch(s);
  final year = m == null ? 0 : int.parse(m.group(1)!);
  return year * 2 + (s.toLowerCase().contains('winter') ? 1 : 0);
}

Future<void> openUrl(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  var ok = false;
  if (uri != null) {
    try {
      ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      ok = false;
    }
  }
  if (!ok && context.mounted) showSnack(context, 'Could not open $url', error: true);
}

String normalizeLink(String raw, {String scheme = 'https'}) {
  final v = raw.trim();
  if (v.isEmpty) return v;
  if (v.contains(':') && !v.startsWith('www.')) return v;
  return '$scheme://$v';
}

void showSnack(BuildContext context, String message, {bool error = false}) {
  final m = ScaffoldMessenger.maybeOf(context);
  if (m == null) return;
  m
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Row(children: [
        Icon(error ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded,
            size: 18, color: error ? const Color(0xFFFF8A8A) : const Color(0xFF6EE7B7)),
        const SizedBox(width: 10),
        Expanded(child: Text(message)),
      ]),
    ));
}

// ---- validators (mirror server/routes/registrations.js) ----

final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final _phoneRe = RegExp(r'^(\+?88)?01[3-9]\d{8}$');
final _nameRe = RegExp(r"^[A-Za-zÀ-ɏঀ-৿\s.'-]+$");

bool validEmail(String v) => _emailRe.hasMatch(v.trim());
bool validBdPhone(String v) => _phoneRe.hasMatch(v.replaceAll(RegExp(r'[\s-]'), ''));
bool validName(String v) => v.trim().length >= 2 && _nameRe.hasMatch(v.trim());
bool validBatch(String v) => RegExp(r'^\d{1,3}$').hasMatch(v.trim());
