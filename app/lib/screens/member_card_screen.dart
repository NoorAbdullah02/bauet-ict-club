import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/offline_cache.dart';
import '../core/theme.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/coder.dart' show LogoImage;
import '../widgets/common.dart';
import 'event_detail_screen.dart';

/// A member's digital card: photo, name, post, committee and a QR code that proves the card is genuine.
/// [code] is set when somebody scanned a card: then the screen says whether that code is real.
class MemberCardScreen extends StatefulWidget {
  const MemberCardScreen({super.key, required this.memberId, this.code});
  final String memberId; // a number (committee member) or r + number (approved applicant)
  final String? code;

  @override
  State<MemberCardScreen> createState() => _MemberCardScreenState();
}

class _MemberCardScreenState extends State<MemberCardScreen> {
  late final AppState _state = context.read<AppState>();
  Map<String, dynamic>? _data;
  bool _missing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final d = await _state.api.memberCard(widget.memberId, c: widget.code);
      if ((widget.code ?? '').isEmpty) cacheJson('card_${widget.memberId}', d);
      if (mounted) setState(() => _data = d);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.status != 404 && (widget.code ?? '').isEmpty) {
        final c = await readCachedJson('card_${widget.memberId}'); // no internet: the card saved last time
        if (c != null && mounted) {
          setState(() => _data = c.data);
          return;
        }
      }
      setState(() {
        if (e.status == 404) {
          _missing = true;
        } else {
          _error = e.message;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    Widget body;
    if (_missing) {
      body = const EmptyState(icon: Icons.person_off_rounded, title: 'Member not found', message: 'This card does not exist.');
    } else if (_error != null) {
      body = ErrorState(message: _error!, onRetry: _load);
    } else if (_data == null) {
      body = const Center(child: CircularProgressIndicator());
    } else {
      final d = _data!;
      final m = Map<String, dynamic>.from(d['member'] as Map);
      final code = '${d['code']}';
      final scanned = (widget.code ?? '').isNotEmpty;
      final verified = d['verified'] == true;
      body = ListView(padding: const EdgeInsets.only(bottom: 40), children: [
        if (scanned)
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), color: (verified ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withValues(alpha: 0.14)),
            child: Row(children: [
              Icon(verified ? Icons.verified_rounded : Icons.gpp_bad_rounded, color: verified ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
              const SizedBox(width: 10),
              Expanded(child: Text(verified ? 'Genuine card: this person is a member of BAUET ICT Club.' : 'This code does not match the card. Do not trust it.', style: bodyStyle(context, weight: FontWeight.w700, size: 13.5))),
            ]),
          ),
        _CardFace(
          name: '${m['name']}',
          position: '${m['position'] ?? ''}',
          department: '${m['department'] ?? ''}',
          batch: '${m['batch'] ?? ''}',
          session: '${m['session'] ?? ''}',
          imageUrl: '${m['image_url'] ?? ''}',
          active: m['current'] != false,
          code: code,
          qrData: '${AppConfig.origin}/card/${m['id']}?c=$code',
        ),
        const SizedBox(height: 14),
        Center(child: Text('The QR code holds a signed code, so a fake card cannot pass the check.', textAlign: TextAlign.center, style: bodyStyle(context, size: 12, color: p.muted))),
      ]);
    }
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Column(children: [
              const PageTopBar(title: 'Membership card', fallback: '/team'),
              const SizedBox(height: 14),
              Expanded(child: body),
            ]),
          ),
        ),
      ),
    );
  }
}


/// The card itself: deep blue with a soft gloss, photo ring, details strip, a chip, the code and the QR code, and a colour stripe at the bottom.
class _CardFace extends StatelessWidget {
  const _CardFace({required this.name, required this.position, required this.department, required this.batch, required this.session, required this.imageUrl, required this.active, required this.code, required this.qrData});
  final String name, position, department, batch, session, imageUrl, code, qrData;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final since = RegExp(r'^Member since ').hasMatch(session);
    Widget cell(String k, String v) => Expanded(
          child: Column(children: [
            Text(k.toUpperCase(), style: monoStyle(context, size: 8.5, color: Colors.white54)),
            const SizedBox(height: 2),
            Text(v.isEmpty ? '-' : v, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w700)),
          ]),
        );
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF06113A), Color(0xFF0B2A78), Color(0xFF0A4D8F)]),
        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
        boxShadow: [BoxShadow(color: const Color(0xFF0B2A78).withValues(alpha: 0.45), blurRadius: 34, offset: const Offset(0, 18))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(children: [
        // soft colour glows and a diagonal gloss (cheap gradients, no blur)
        Positioned(top: -60, left: -40, child: Container(width: 220, height: 220, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [const Color(0xFF2B63FF).withValues(alpha: 0.55), Colors.transparent])))),
        Positioned(bottom: -70, right: -50, child: Container(width: 240, height: 240, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [const Color(0xFF11B5A4).withValues(alpha: 0.5), Colors.transparent])))),
        Positioned.fill(child: IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.centerRight, stops: const [0.0, 0.35, 0.6], colors: [Colors.white.withValues(alpha: 0.16), Colors.white.withValues(alpha: 0.03), Colors.transparent]))))),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 18, 0),
            child: Row(children: [
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)), child: const LogoImage.club(height: 22)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), color: Colors.white.withValues(alpha: 0.12), border: Border.all(color: Colors.white24)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: active ? const Color(0xFF35D989) : Colors.white54, boxShadow: active ? [const BoxShadow(color: Color(0xFF35D989), blurRadius: 6)] : null)),
                  const SizedBox(width: 6),
                  Text(active ? 'Active member' : 'Former member', style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700)),
                ]),
              ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(26), gradient: const LinearGradient(colors: [Color(0xFF35D989), Color(0xFF38C8F0), Color(0xFF8B5CF6)])),
                child: Container(width: 86, height: 86, clipBehavior: Clip.antiAlias, decoration: BoxDecoration(borderRadius: BorderRadius.circular(23), color: const Color(0xFF0B2A78)), child: NetImage(imageUrl, fallbackLabel: name)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: displayStyle(context, 22, color: Colors.white, height: 1.1)),
                  const SizedBox(height: 8),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), color: Colors.white.withValues(alpha: 0.16)), child: Text(position, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700))),
                ]),
              ),
            ]),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), color: Colors.white.withValues(alpha: 0.08), border: Border.all(color: Colors.white.withValues(alpha: 0.14))),
            child: Row(children: [cell('Department', department), cell('Batch', batch), cell(since ? 'Joined' : 'Committee', since ? session.replaceFirst('Member since ', '') : (session.isEmpty ? 'BAUET ICT Club' : session))]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 18),
            child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(width: 38, height: 26, decoration: BoxDecoration(borderRadius: BorderRadius.circular(6), gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFF7DC8A), Color(0xFFE2B64E), Color(0xFFB98A2B)]))),
                  const SizedBox(height: 12),
                  Text('CARD CODE', style: monoStyle(context, size: 9, color: Colors.white54)),
                  const SizedBox(height: 2),
                  Text(code, style: monoStyle(context, size: 14, color: Colors.white)),
                  const SizedBox(height: 8),
                  Text('Scan the QR code to check this card', style: bodyStyle(context, size: 11, color: Colors.white60)),
                ]),
              ),
              Container(padding: const EdgeInsets.all(6), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)), child: TicketQr(code: qrData, size: 96)),
            ]),
          ),
          Container(height: 6, decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF35D989), Color(0xFF38C8F0), Color(0xFF8B5CF6), Color(0xFFFF6B8A), Color(0xFFFFD166)]))),
        ]),
      ]),
    );
  }
}
