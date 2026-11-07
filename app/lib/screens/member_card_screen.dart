import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../core/config.dart';
import '../core/offline_cache.dart';
import '../core/theme.dart';
import '../core/utils.dart';
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
        const SizedBox(height: 16),
        Center(
          child: FilledButton.icon(
            onPressed: () => _share(context, name: '${m['name']}', position: '${m['position'] ?? ''}', url: '${AppConfig.origin}/card/${m['id']}?c=$code'),
            icon: const Icon(Icons.share_rounded, size: 18),
            label: const Text('Share this card'),
          ),
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


/// The share sheet: Facebook, WhatsApp, Telegram, X, LinkedIn, e-mail, the phone's own share menu, or copy the link.
void _share(BuildContext context, {required String name, required String position, required String url}) {
  final text = '$name, ${position.isEmpty ? 'Member' : position} at BAUET ICT Club';
  const enc = Uri.encodeComponent;
  final items = <(IconData, String, Color, String)>[
    (Icons.facebook_rounded, 'Facebook', const Color(0xFF1877F2), 'https://www.facebook.com/sharer/sharer.php?u=${enc(url)}'),
    (Icons.chat_rounded, 'WhatsApp', const Color(0xFF25D366), 'https://wa.me/?text=${enc('$text\n$url')}'),
    (Icons.send_rounded, 'Telegram', const Color(0xFF229ED9), 'https://t.me/share/url?url=${enc(url)}&text=${enc(text)}'),
    (Icons.alternate_email_rounded, 'X', const Color(0xFF111827), 'https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}'),
    (Icons.business_center_rounded, 'LinkedIn', const Color(0xFF0A66C2), 'https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}'),
    (Icons.mail_rounded, 'E-mail', const Color(0xFFEA4335), 'mailto:?subject=${enc('$name | BAUET ICT Club')}&body=${enc('$text\n$url')}'),
  ];
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    useSafeArea: true,
    builder: (ctx) {
      final p = ctx.pal;
      Widget tile(IconData icon, String label, Color color, VoidCallback onTap) => InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(width: 52, height: 52, decoration: BoxDecoration(color: color, shape: BoxShape.circle), child: Icon(icon, color: Colors.white, size: 26)),
                const SizedBox(height: 6),
                Text(label, style: bodyStyle(ctx, size: 12, weight: FontWeight.w600)),
              ]),
            ),
          );
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Share this card', style: displayStyle(ctx, 22)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 4,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 0.85,
            children: [
              for (final it in items)
                tile(it.$1, it.$2, it.$3, () {
                  Navigator.pop(ctx);
                  openUrl(context, it.$4);
                }),
              tile(Icons.ios_share_rounded, 'More apps', p.accent, () {
                Navigator.pop(ctx);
                Share.share('$text\n$url', subject: '$name | BAUET ICT Club');
              }),
              tile(Icons.link_rounded, 'Copy link', p.tech, () async {
                await Clipboard.setData(ClipboardData(text: url));
                if (ctx.mounted) Navigator.pop(ctx);
                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Card link copied')));
              }),
            ],
          ),
        ]),
      );
    },
  );
}


/// The portrait lanyard badge: navy club strip, the post in big letters, an arched photo, and a grey panel with name, department, QR code and session.
/// Everything is sized from the card width, so it looks the same on every phone.
class _CardFace extends StatelessWidget {
  const _CardFace({required this.name, required this.position, required this.department, required this.batch, required this.session, required this.imageUrl, required this.active, required this.code, required this.qrData});
  final String name, position, department, batch, session, imageUrl, code, qrData;
  final bool active;

  static const _navy = Color(0xFF0A1A3F);

  TextStyle _cond(double size, {Color color = _navy, FontWeight weight = FontWeight.w700, FontStyle style = FontStyle.normal, double spacing = 0, double height = 1}) =>
      GoogleFonts.barlowCondensed(fontSize: size, color: color, fontWeight: weight, fontStyle: style, letterSpacing: spacing, height: height);

  @override
  Widget build(BuildContext context) {
    final label = session.replaceFirst('Member since ', 'Since ');
    final post = position.isEmpty ? 'Member' : position;
    return LayoutBuilder(builder: (context, box) {
      final outer = math.min(box.maxWidth, 372.0);
      final pad = outer * 0.017;
      final w = outer - pad * 2;
      final h = w * 16 / 9;
      final postFs = w * (post.length > 22 ? 0.076 : post.length > 13 ? 0.105 : 0.14);
      final nameFs = w * (name.length > 26 ? 0.066 : name.length > 16 ? 0.086 : 0.11);
      return Center(
        child: SizedBox(
          width: outer,
          height: h + pad * 2,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(outer * 0.08),
              gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF35D989), Color(0xFF38C8F0), Color(0xFF8B5CF6), Color(0xFFFF6B8A)]),
              boxShadow: [BoxShadow(color: const Color(0xFF061440).withValues(alpha: 0.4), blurRadius: 40, offset: const Offset(0, 22))],
            ),
            child: Padding(
              padding: EdgeInsets.all(pad),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(outer * 0.064),
              child: Stack(children: [
                // background wash and a faint wordmark
                Positioned.fill(child: DecoratedBox(decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.white, Color(0xFFF3F6FC)])))),
                Positioned(top: h * 0.1, right: -w * 0.1, child: Container(width: w * 0.7, height: w * 0.7, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [const Color(0xFF38C8F0).withValues(alpha: 0.28), Colors.transparent])))),
                Positioned(top: w * 0.36, right: w * 0.05, child: Text('ICT', style: _cond(w * 0.3, color: const Color(0xFF0B2A78).withValues(alpha: 0.07), height: 0.9))),

                // navy strip
                Positioned(
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: w * 0.27,
                  child: DecoratedBox(
                    decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF061440), Color(0xFF0B2A78), Color(0xFF0A4D8F)])),
                    child: Stack(children: [
                      Positioned(top: w * 0.05, left: w * 0.03, right: w * 0.03, child: Container(padding: EdgeInsets.all(w * 0.016), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(w * 0.04)), child: SizedBox(height: w * 0.12, child: Image.asset('assets/logos/ict-club.png', fit: BoxFit.contain)))),
                      Positioned(
                        top: h * 0.25,
                        bottom: h * 0.38,
                        left: 0,
                        right: 0,
                        child: Center(child: FittedBox(fit: BoxFit.scaleDown, child: RotatedBox(quarterTurns: 3, child: Text('BAUET ICT CLUB', maxLines: 1, softWrap: false, style: _cond(w * 0.064, color: Colors.white, weight: FontWeight.w600, spacing: w * 0.0128))))),
                      ),
                      Positioned(top: h * 0.23, left: w * 0.09, right: w * 0.09, child: Container(height: 1, color: const Color(0xFF7CF0B2).withValues(alpha: 0.7))),
                    ]),
                  ),
                ),

                // the post and the active chip
                Positioned(
                  left: w * 0.27,
                  right: 0,
                  top: w * 0.06,
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: w * 0.04),
                    child: Column(children: [
                      post.length <= 13
                          ? FittedBox(fit: BoxFit.scaleDown, child: Text(post.toUpperCase(), maxLines: 1, softWrap: false, style: _cond(postFs, height: 0.92)))
                          : Text(post.toUpperCase(), textAlign: TextAlign.center, style: _cond(postFs, height: 0.92)),
                      SizedBox(height: w * 0.02),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: w * 0.026, vertical: w * 0.009),
                        decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), color: const Color(0xFF0B2A78).withValues(alpha: 0.07)),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Container(width: w * 0.016, height: w * 0.016, decoration: BoxDecoration(shape: BoxShape.circle, color: active ? const Color(0xFF16A34A) : Colors.blueGrey)),
                          SizedBox(width: w * 0.012),
                          Text(active ? 'ACTIVE MEMBER' : 'FORMER MEMBER', style: GoogleFonts.jetBrainsMono(fontSize: w * 0.025, letterSpacing: w * 0.0045, color: const Color(0xFF0B2A78))),
                        ]),
                      ),
                    ]),
                  ),
                ),

                // arched photo
                Positioned(
                  left: w * 0.27,
                  right: 0,
                  top: h * 0.2,
                  height: h * 0.49,
                  child: LayoutBuilder(builder: (context, b) {
                    final pw = b.maxWidth, ph = b.maxHeight;
                    final radius = Radius.elliptical(pw * 0.42, ph * 0.18);
                    final arch = BorderRadius.only(topLeft: radius, topRight: radius);
                    return Stack(children: [
                      Positioned(left: pw * 0.08, right: pw * 0.08, top: ph * 0.12, bottom: 0, child: DecoratedBox(decoration: BoxDecoration(borderRadius: arch, gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF35D989), Color(0xFF38C8F0), Color(0xFF8B5CF6)])))),
                      Positioned(
                        left: pw * 0.105,
                        right: pw * 0.105,
                        top: ph * 0.135,
                        bottom: 0,
                        child: ShaderMask(
                          blendMode: BlendMode.dstIn,
                          shaderCallback: (r) => const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.black, Colors.black, Colors.transparent], stops: [0, 0.82, 1]).createShader(r),
                          child: ClipRRect(
                            borderRadius: arch,
                            child: ColoredBox(
                              color: const Color(0xFF0B2A78),
                              child: imageUrl.isEmpty
                                  ? Center(child: Text(_initials(name), style: _cond(w * 0.2, color: Colors.white)))
                                  : NetImage(imageUrl, fit: BoxFit.cover),
                            ),
                          ),
                        ),
                      ),
                    ]);
                  }),
                ),

                // grey panel with the raised tab on the right
                Positioned(left: 0, right: 0, bottom: 0, height: h * 0.37, child: CustomPaint(painter: _PanelPainter())),

                // name, department, code, QR
                Positioned(
                  left: w * 0.07,
                  right: w * 0.09,
                  bottom: w * 0.055,
                  height: h * 0.33,
                  child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Expanded(
                      child: Column(mainAxisAlignment: MainAxisAlignment.end, crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(name.toUpperCase(), maxLines: 2, overflow: TextOverflow.ellipsis, style: _cond(nameFs, color: const Color(0xFF3B4658), height: 0.92)),
                        SizedBox(height: w * 0.016),
                        Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: w * 0.02, children: [
                          Text(department.isEmpty ? 'BAUET' : department, style: _cond(w * 0.066, style: FontStyle.italic)),
                          if (batch.isNotEmpty)
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: w * 0.016, vertical: w * 0.005),
                              decoration: BoxDecoration(color: const Color(0xFF0B2A78), borderRadius: BorderRadius.circular(w * 0.012)),
                              child: Text('Batch $batch', style: _cond(w * 0.036, color: Colors.white, spacing: w * 0.0015)),
                            ),
                        ]),
                        SizedBox(height: w * 0.022),
                        Text('MEMBER ID', style: GoogleFonts.jetBrainsMono(fontSize: w * 0.023, letterSpacing: w * 0.0046, color: const Color(0xFF64748B))),
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: w * 0.014, vertical: w * 0.004),
                            decoration: BoxDecoration(color: _navy, borderRadius: BorderRadius.circular(w * 0.01)),
                            child: Text('<ICT/>', style: GoogleFonts.jetBrainsMono(fontSize: w * 0.03, fontWeight: FontWeight.w700, color: const Color(0xFF7CF0B2))),
                          ),
                          SizedBox(width: w * 0.016),
                          Flexible(child: Text(code, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.jetBrainsMono(fontSize: w * 0.035, letterSpacing: w * 0.002, color: _navy))),
                        ]),
                      ]),
                    ),
                    SizedBox(width: w * 0.03),
                    SizedBox(
                      width: w * 0.26,
                      height: w * 0.26,
                      child: Stack(clipBehavior: Clip.none, children: [
                        Positioned.fill(
                          child: Container(
                            padding: EdgeInsets.all(w * 0.014),
                            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.85), border: Border.all(color: _navy, width: w * 0.008), borderRadius: BorderRadius.circular(w * 0.05)),
                            child: QrImageView(data: qrData, padding: EdgeInsets.zero, backgroundColor: Colors.white, errorCorrectionLevel: QrErrorCorrectLevel.M),
                          ),
                        ),
                        Positioned(
                          top: -w * 0.02,
                          left: 0,
                          right: 0,
                          child: Center(child: Container(color: const Color(0xFFDDE2EC), padding: EdgeInsets.symmetric(horizontal: w * 0.014), child: Text('SCAN ME', style: _cond(w * 0.03, weight: FontWeight.w800, spacing: w * 0.004)))),
                        ),
                      ]),
                    ),
                  ]),
                ),
                // year / session, turned sideways like the printed design
                Positioned(right: w * 0.026, bottom: w * 0.06, child: RotatedBox(quarterTurns: 3, child: Text(label.isEmpty ? 'BAUET ICT CLUB' : label.toUpperCase(), style: _cond(w * 0.04, weight: FontWeight.w600, spacing: w * 0.007)))),
              ]),
              ),
            ),
          ),
        ),
      );
    });
  }

  static String _initials(String n) => n.split(RegExp(r'\s+')).where((x) => x.isNotEmpty).take(2).map((x) => x[0]).join().toUpperCase();
}

/// The grey bottom panel: the same shape as the website badge (a lower left, a raised tab on the right).
class _PanelPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 100, sy = size.height / 40;
    final path = Path()
      ..moveTo(0, 9 * sy)
      ..quadraticBezierTo(0, 7 * sy, 2.5 * sx, 6 * sy)
      ..lineTo(8 * sx, 3.5 * sy)
      ..quadraticBezierTo(10 * sx, 2.5 * sy, 13 * sx, 2.5 * sy)
      ..lineTo(48 * sx, 2.5 * sy)
      ..quadraticBezierTo(52 * sx, 2.5 * sy, 54 * sx, 1.2 * sy)
      ..quadraticBezierTo(56 * sx, 0, 59 * sx, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawShadow(path, const Color(0xFF061440), 6, false);
    canvas.drawPath(
      path,
      Paint()..shader = const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFFEEF1F7), Color(0xFFD3D9E6)]).createShader(Offset.zero & size),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
