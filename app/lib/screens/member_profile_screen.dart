import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../core/config.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'event_detail_screen.dart';

/// A member's public profile: photo, post, points, awards and every certificate, with a link to the card.
/// The server only returns stats for the caller's own code, so nothing private leaks.
class MemberProfileScreen extends StatefulWidget {
  const MemberProfileScreen({super.key, required this.memberId, this.code});
  final String memberId;
  final String? code;

  @override
  State<MemberProfileScreen> createState() => _MemberProfileScreenState();
}

class _MemberProfileScreenState extends State<MemberProfileScreen> {
  late final AppState _state = context.read<AppState>();
  Map<String, dynamic>? _d;
  String? _error;
  bool _missing = false;
  String _proof = ''; // short-lived edit token from the e-mail code
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _error = null;
      _missing = false;
    });
    try {
      final d = await _state.api.memberCard(widget.memberId, c: widget.code);
      if (mounted) setState(() => _d = d);
    } on ApiException catch (e) {
      if (mounted) setState(() => e.status == 404 ? _missing = true : _error = e.message);
    }
  }

  String get _profileUrl => '${AppConfig.origin}/member/${widget.memberId}${widget.code != null ? '?c=${widget.code}' : ''}';

  String get _code => '${_d?['code'] ?? ''}';

  /// Changing a photo or a birth date needs a 6-digit code sent to the e-mail the member joined with.
  Future<bool> _ensureProof() async {
    if (_proof.isNotEmpty) return true;
    final email = TextEditingController();
    final digits = TextEditingController();
    var sent = false;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Prove it is you'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('We send a 6-digit code to the e-mail you joined the club with.', style: bodyStyle(ctx, size: 12.5, color: ctx.pal.muted)),
              const SizedBox(height: 12),
              TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail', border: OutlineInputBorder())),
              if (sent) ...[
                const SizedBox(height: 10),
                TextField(controller: digits, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: '6-digit code', border: OutlineInputBorder())),
              ],
              const SizedBox(height: 6),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () async {
                    try {
                      await _state.api.cardOtpRequest(email.text.trim(), _d?['member']?['id']);
                      setD(() => sent = true);
                      if (ctx.mounted) showSnack(ctx, 'Code sent. Check your e-mail.');
                    } on ApiException catch (e) {
                      if (ctx.mounted) showSnack(ctx, e.message, error: true);
                    }
                  },
                  child: Text(sent ? 'Send the code again' : 'Send the code'),
                ),
              ),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            if (sent)
              FilledButton(
                onPressed: () async {
                  try {
                    _proof = await _state.api.cardOtpVerify(email.text.trim(), digits.text.trim());
                    if (ctx.mounted) Navigator.pop(ctx, _proof.isNotEmpty);
                  } on ApiException catch (e) {
                    if (ctx.mounted) showSnack(ctx, e.message, error: true);
                  }
                },
                child: const Text('Confirm'),
              ),
          ],
        ),
      ),
    );
    email.dispose();
    digits.dispose();
    return ok == true && _proof.isNotEmpty;
  }

  Future<void> _changePhoto() async {
    if (!await _ensureProof()) return;
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1200, maxHeight: 1200, imageQuality: 88);
    if (picked == null) return;
    setState(() => _busy = true);
    try {
      final name = picked.name.isEmpty ? 'photo.jpg' : picked.name;
      final mime = picked.mimeType ?? (name.toLowerCase().endsWith('.png') ? 'image/png' : name.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg');
      final url = await _state.api.uploadPhoto(picked.path, name, mime);
      await _state.api.setCardPhoto(widget.memberId, code: _code, proof: _proof, photoUrl: url);
      await _load();
      if (mounted) showSnack(context, 'Profile photo updated');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } on FileSystemException {
      if (mounted) showSnack(context, 'Could not read that picture', error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _changeBirthdate() async {
    if (!await _ensureProof() || !mounted) return;
    final now = DateTime.now();
    final current = DateTime.tryParse('${_d?['member']?['birth_date'] ?? ''}') ?? DateTime(now.year - 18, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(1960),
      lastDate: now,
      helpText: 'Your date of birth',
    );
    if (picked == null) return;
    final iso = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    setState(() => _busy = true);
    try {
      await _state.api.setCardBirthdate(widget.memberId, code: _code, proof: _proof, date: iso);
      await _load();
      if (mounted) showSnack(context, 'Date of birth saved');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final d = _d;
    final m = d?['member'] is Map ? Map<String, dynamic>.from(d!['member'] as Map) : null;
    final stats = d?['stats'] is Map ? Map<String, dynamic>.from(d!['stats'] as Map) : const <String, dynamic>{};
    final certs = stats['certificates'] is List ? (stats['certificates'] as List).whereType<Map>().toList() : const <Map>[];
    final awards = stats['awards'] is List ? (stats['awards'] as List).whereType<Map>().toList() : const <Map>[];
    final points = (stats['points'] is num) ? (stats['points'] as num).toInt() : 0;
    final events = (stats['eventsCount'] is num) ? (stats['eventsCount'] as num).toInt() : 0;
    final photo = AppConfig.portrait(m?['image_url']?.toString(), 480);

    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                const PageTopBar(title: 'Member profile', fallback: '/team'),
                const SizedBox(height: 12),
                if (_missing)
                  const EmptyState(icon: Icons.person_off_rounded, title: 'Member not found', message: 'This profile link is not valid any more.')
                else if (_error != null)
                  ErrorState(message: _error!, onRetry: _load)
                else if (m == null)
                  const ShimmerList(count: 3, height: 110)
                else ...[
                  GlassCard(
                    padding: const EdgeInsets.all(18),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Container(
                          width: 84,
                          height: 84,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: p.accent.withValues(alpha: 0.35), width: 3),
                            color: p.alt,
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: photo.isEmpty
                              ? Center(child: Text('${m['name'] ?? '?'}'.characters.first, style: displayStyle(context, 30, color: p.accent)))
                              : Image.network(photo, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Icon(Icons.person_rounded, color: p.muted, size: 34)),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Flexible(child: Text('${m['name'] ?? ''}', style: displayStyle(context, 22), maxLines: 2, overflow: TextOverflow.ellipsis)),
                              if (d?['verified'] == true) ...[
                                const SizedBox(width: 6),
                                const Icon(Icons.verified_rounded, size: 18, color: Color(0xFF10B981)),
                              ],
                            ]),
                            const SizedBox(height: 2),
                            Text('${m['position'] ?? 'Member'}', style: bodyStyle(context, size: 13.5, weight: FontWeight.w700, color: p.accent)),
                            const SizedBox(height: 4),
                            Text(
                              [m['department'], m['batch'] != null ? '${m['batch']} batch' : null, m['session']].where((x) => x != null && '$x'.isNotEmpty).join(' · '),
                              style: bodyStyle(context, size: 12, color: p.muted),
                            ),
                          ]),
                        ),
                      ]),
                      if ('${m['bio'] ?? ''}'.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text('${m['bio']}', style: bodyStyle(context, size: 12.5, color: p.muted)),
                      ],
                      const SizedBox(height: 14),
                      Row(children: [
                        Expanded(
                          child: _stat(context, '$points', 'XP points', Icons.bolt_rounded, p.accent),
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: _stat(context, '$events', 'Events attended', Icons.event_available_rounded, p.tech)),
                        const SizedBox(width: 8),
                        Expanded(child: _stat(context, '${certs.length}', 'Certificates', Icons.workspace_premium_rounded, p.third)),
                      ]),
                      const SizedBox(height: 14),
                      Row(children: [
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => context.push('/card/${m['id']}${widget.code != null ? '?c=${widget.code}' : ''}'),
                            icon: const Icon(Icons.badge_rounded, size: 16),
                            label: const Text('Membership card'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => Share.share('${m['name']} | BAUET ICT Club\n$_profileUrl', subject: '${m['name']} | BAUET ICT Club'),
                            icon: const Icon(Icons.share_rounded, size: 16),
                            label: const Text('Share profile'),
                          ),
                        ),
                      ]),
                      const SizedBox(height: 2),
                      Wrap(spacing: 4, children: [
                        if (_busy)
                          const Padding(padding: EdgeInsets.only(left: 8, top: 12), child: SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))),
                        TextButton.icon(
                          onPressed: _busy ? null : _changePhoto,
                          icon: const Icon(Icons.photo_camera_rounded, size: 15),
                          label: const Text('Change photo', style: TextStyle(fontSize: 12.5)),
                        ),
                        TextButton.icon(
                          onPressed: _busy ? null : _changeBirthdate,
                          icon: const Icon(Icons.cake_rounded, size: 15),
                          label: Text(
                            '${m['birth_date'] ?? ''}'.isEmpty ? 'Add birth date' : 'Born ${m['birth_date']}',
                            style: const TextStyle(fontSize: 12.5),
                          ),
                        ),
                      ]),
                    ]),
                  ),
                  if (awards.isNotEmpty) ...[
                    const SizedBox(height: 18),
                    Text('Points earned', style: monoStyle(context, size: 11, color: p.tech)),
                    const SizedBox(height: 8),
                    GlassCard(
                      padding: EdgeInsets.zero,
                      child: Column(children: [
                        for (final (i, a) in awards.indexed) ...[
                          if (i > 0) Divider(height: 1, color: p.line),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                            child: Row(children: [
                              Expanded(child: Text('${a['reason'] ?? ''}', style: bodyStyle(context, size: 13))),
                              Text('+${a['points'] ?? 0}', style: monoStyle(context, size: 12, color: p.accent)),
                            ]),
                          ),
                        ],
                      ]),
                    ),
                  ],
                  const SizedBox(height: 18),
                  Text('Certificates', style: monoStyle(context, size: 11, color: p.tech)),
                  const SizedBox(height: 8),
                  if (certs.isEmpty)
                    GlassCard(child: Text('No certificates published yet.', style: bodyStyle(context, size: 13, color: p.muted)))
                  else
                    GlassCard(
                      padding: EdgeInsets.zero,
                      child: Column(children: [
                        for (final (i, c) in certs.indexed) ...[
                          if (i > 0) Divider(height: 1, color: p.line),
                          ListTile(
                            onTap: () => context.push('/verify/${Uri.encodeComponent('${c['code']}')}'),
                            leading: Icon(Icons.workspace_premium_rounded, color: p.third),
                            title: Text('${c['event'] ?? 'Certificate'}', style: bodyStyle(context, size: 13.5, weight: FontWeight.w700)),
                            subtitle: Text('${c['date'] ?? ''}'.split('T').first, style: bodyStyle(context, size: 11.5, color: p.muted)),
                            trailing: const Icon(Icons.chevron_right_rounded, size: 18),
                          ),
                        ],
                      ]),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _stat(BuildContext context, String value, String label, IconData icon, Color color) {
    final p = context.pal;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(color: p.alt, borderRadius: BorderRadius.circular(14)),
      child: Column(children: [
        Icon(icon, size: 17, color: color),
        const SizedBox(height: 4),
        Text(value, style: displayStyle(context, 20)),
        Text(label, textAlign: TextAlign.center, style: monoStyle(context, size: 8.5, color: p.muted)),
      ]),
    );
  }
}
