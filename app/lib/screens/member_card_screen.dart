import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/offline_cache.dart';
import '../core/theme.dart';
import '../data/api.dart';
import '../state/app_state.dart';
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
      final meta = ['${m['department'] ?? ''}', if ('${m['batch'] ?? ''}'.isNotEmpty) '${m['batch']} Batch'].where((x) => x.isNotEmpty).join(' · ');
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
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF071A52), Color(0xFF1F4FD8), Color(0xFF17A2D8)]),
            boxShadow: [BoxShadow(color: const Color(0xFF1F4FD8).withValues(alpha: 0.4), blurRadius: 34, offset: const Offset(0, 16))],
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(children: [
            Positioned(top: 0, left: 0, right: 0, height: 80, child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.white.withValues(alpha: 0.22), Colors.transparent])))),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 18, 22, 0),
                child: Row(children: [
                  Text('BAUET ICT CLUB · MEMBER', style: monoStyle(context, size: 10, color: Colors.white70)),
                  const Spacer(),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), color: Colors.white.withValues(alpha: 0.16)), child: Text(m['current'] == false ? 'Former' : 'Active', style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700))),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.all(22),
                child: Row(children: [
                  Container(width: 92, height: 92, clipBehavior: Clip.antiAlias, decoration: BoxDecoration(borderRadius: BorderRadius.circular(22), border: Border.all(color: Colors.white54, width: 2)), child: NetImage('${m['image_url'] ?? ''}'.isEmpty ? '' : '${m['image_url']}', fallbackLabel: '${m['name']}')),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${m['name']}', style: displayStyle(context, 22, color: Colors.white)),
                      const SizedBox(height: 4),
                      Text('${m['position'] ?? ''}', style: bodyStyle(context, size: 14, color: Colors.white.withValues(alpha: 0.9))),
                      if (meta.isNotEmpty) Text(meta, style: bodyStyle(context, size: 12, color: Colors.white70)),
                    ]),
                  ),
                ]),
              ),
              Padding(padding: const EdgeInsets.symmetric(horizontal: 22), child: Divider(color: Colors.white.withValues(alpha: 0.3))),
              Padding(
                padding: const EdgeInsets.all(22),
                child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('COMMITTEE', style: monoStyle(context, size: 9.5, color: Colors.white60)),
                      Text('${m['session'] ?? 'BAUET ICT Club'}', style: displayStyle(context, 18, color: Colors.white)),
                      const SizedBox(height: 14),
                      Text('CARD CODE', style: monoStyle(context, size: 9.5, color: Colors.white60)),
                      Text(code, style: monoStyle(context, size: 14, color: Colors.white)),
                    ]),
                  ),
                  TicketQr(code: '${AppConfig.origin}/card/${m['id']}?c=$code', size: 104),
                ]),
              ),
              Container(width: double.infinity, color: Colors.black.withValues(alpha: 0.18), padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10), child: Text('Scan this QR code to check the card', style: bodyStyle(context, size: 11.5, color: Colors.white70))),
            ]),
          ]),
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
