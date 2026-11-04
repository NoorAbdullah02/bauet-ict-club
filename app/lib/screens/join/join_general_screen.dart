import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../state/app_state.dart';
import '../../widgets/coder.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'join_common.dart';

/// General membership: one scrolling "ticket" with an interest picker.
class JoinGeneralScreen extends StatefulWidget {
  const JoinGeneralScreen({super.key});

  @override
  State<JoinGeneralScreen> createState() => _JoinGeneralScreenState();
}

class _JoinGeneralScreenState extends State<JoinGeneralScreen> {
  final _name = TextEditingController();
  final _sid = TextEditingController();
  final _batch = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _note = TextEditingController();
  String _dept = '';
  String _gender = '';
  String _level = 'Beginner';
  final Set<String> _interests = {};
  PickedPhoto? _photo;
  bool _busy = false;
  bool _done = false;
  final Map<String, String> _errors = {};

  @override
  void dispose() {
    for (final c in [_name, _sid, _batch, _phone, _email, _note]) {
      c.dispose();
    }
    super.dispose();
  }

  void _clear(String k) {
    if (_errors.containsKey(k)) setState(() => _errors.remove(k));
  }

  void _toggle(String i) {
    setState(() {
      if (_interests.contains(i)) {
        _interests.remove(i);
      } else if (_interests.length < kMaxInterests) {
        _interests.add(i);
      }
      _errors.remove('interests');
    });
    HapticFeedback.selectionClick();
  }

  Future<void> _submit() async {
    final e = <String, String>{};
    if (!validName(_name.text)) e['full_name'] = 'Enter your full name';
    if (_sid.text.trim().length < 2) e['student_id'] = 'Student ID is required';
    if (!validBatch(_batch.text)) e['batch'] = 'Enter your batch number, e.g. 14';
    if (_dept.isEmpty) e['department'] = 'Select your department';
    if (!validBdPhone(_phone.text)) e['phone'] = 'Enter a valid BD mobile (01XXXXXXXXX)';
    if (!validEmail(_email.text)) e['email'] = 'Enter a valid email';
    if (_interests.isEmpty) e['interests'] = 'Pick at least one area';
    if (e.isNotEmpty) {
      setState(() {
        _errors
          ..clear()
          ..addAll(e);
      });
      HapticFeedback.lightImpact();
      return;
    }
    setState(() {
      _busy = true;
      _errors.clear();
    });
    final res = await submitJoin(
      context.read<AppState>().api,
      {
        'type': 'general',
        'full_name': _name.text.trim(),
        'student_id': _sid.text.trim(),
        'batch': _batch.text.trim(),
        'department': _dept,
        'phone': _phone.text.replaceAll(RegExp(r'[\s-]'), ''),
        'email': _email.text.trim(),
        'gender': _gender,
        'interests': _interests.toList(),
        'experience': _level,
        'note': _note.text.trim(),
      },
      _photo,
    );
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (res.ok) {
        _done = true;
      } else {
        _errors.addAll(res.fields);
      }
    });
    if (!res.ok) showSnack(context, res.message ?? 'Submission failed', error: true);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: _done
              ? const JoinSuccess(title: 'Welcome aboard!', message: 'Your membership request is in. Watch your email for workshop invites.')
              : ListView(
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
                  children: [
                    const JoinTopBar(title: 'General membership', eyebrow: 'Be a member'),
                    const SizedBox(height: 14),
                    const PromptLine('apply --role=member --free'),
                    const SizedBox(height: 14),
                    _TicketHeader(p: p).stagger(0),
                    const SizedBox(height: 18),
                    GlassCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        CodeLabel('your details', color: p.pink),
                        const SizedBox(height: 14),
                        AppField(controller: _name, label: 'Full name', error: _errors['full_name'], icon: Icons.person_outline_rounded, textInputAction: TextInputAction.next, onChanged: () => _clear('full_name')),
                        const SizedBox(height: 14),
                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Expanded(flex: 3, child: AppField(controller: _sid, label: 'Student ID', error: _errors['student_id'], textInputAction: TextInputAction.next, onChanged: () => _clear('student_id'))),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: AppField(
                              controller: _batch,
                              label: 'Batch',
                              error: _errors['batch'],
                              keyboard: TextInputType.number,
                              maxLength: 3,
                              formatters: [FilteringTextInputFormatter.digitsOnly],
                              onChanged: () => _clear('batch'),
                            ),
                          ),
                        ]),
                        const SizedBox(height: 14),
                        PickerField(label: 'Department', value: _dept, options: kDepartments, error: _errors['department'], icon: Icons.apartment_rounded, onChanged: (v) => setState(() {
                          _dept = v;
                          _errors.remove('department');
                        })),
                        const SizedBox(height: 14),
                        AppField(controller: _phone, label: 'Mobile (01XXXXXXXXX)', error: _errors['phone'], keyboard: TextInputType.phone, icon: Icons.call_outlined, textInputAction: TextInputAction.next, onChanged: () => _clear('phone')),
                        const SizedBox(height: 14),
                        AppField(controller: _email, label: 'Email', error: _errors['email'], keyboard: TextInputType.emailAddress, icon: Icons.alternate_email_rounded, textInputAction: TextInputAction.next, onChanged: () => _clear('email')),
                        const SizedBox(height: 16),
                        ChoiceRow(label: 'Gender (optional)', options: kGenders, value: _gender, onChanged: (v) => setState(() => _gender = v)),
                      ]),
                    ).stagger(1),
                    const SizedBox(height: 16),
                    GlassCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          CodeLabel('what excites you? *', color: p.pink),
                          const Spacer(),
                          Text('${_interests.length}/$kMaxInterests', style: monoStyle(context, size: 11)),
                        ]),
                        const SizedBox(height: 14),
                        Wrap(spacing: 8, runSpacing: 10, children: [
                          for (final i in kInterests) PillChip(label: i, selected: _interests.contains(i), color: p.pink, onTap: () => _toggle(i)),
                        ]),
                        if (_errors['interests'] != null)
                          Padding(padding: const EdgeInsets.only(top: 8), child: Text(_errors['interests']!, style: bodyStyle(context, size: 12, color: const Color(0xFFEF4444)))),
                        const SizedBox(height: 20),
                        CodeLabel('experience level', color: p.pink),
                        const SizedBox(height: 10),
                        SegmentedLevel(value: _level, onChanged: (v) => setState(() => _level = v)),
                      ]),
                    ).stagger(2),
                    const SizedBox(height: 16),
                    GlassCard(
                      padding: const EdgeInsets.all(20),
                      child: Row(children: [
                        PhotoSlot(photo: _photo, size: 76, label: 'Photo', onTap: () async {
                          final ph = await pickPhoto(context);
                          if (ph != null && mounted) setState(() => _photo = ph);
                        }),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('Profile photo', style: bodyStyle(context, weight: FontWeight.w700)),
                            const SizedBox(height: 2),
                            Text('Optional. JPG or PNG, up to 3MB.', style: bodyStyle(context, size: 12.5, color: p.muted)),
                          ]),
                        ),
                      ]),
                    ).stagger(3),
                    const SizedBox(height: 16),
                    AppField(controller: _note, label: 'Anything else? (optional)', maxLines: 4, maxLength: 600, keyboard: TextInputType.multiline).stagger(4),
                    const SizedBox(height: 22),
                    GradientButton(
                      label: 'Become a member',
                      icon: Icons.bolt_rounded,
                      loading: _busy,
                      colors: [p.pink, p.accent],
                      onPressed: _submit,
                    ).stagger(5),
                  ],
                ),
        ),
      ),
    );
  }
}

class _TicketHeader extends StatelessWidget {
  const _TicketHeader({required this.p});
  final Pal p;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [p.pink, p.accent]),
      ),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('ADMIT ONE', style: monoStyle(context, color: Colors.white70, size: 10.5)),
            const SizedBox(height: 6),
            Text('Welcome to the community', style: displayStyle(context, 25, color: Colors.white)),
            const SizedBox(height: 6),
            Text('Free workshops, contests and a crew of builders.', style: bodyStyle(context, color: Colors.white.withValues(alpha: 0.9), size: 13.5)),
          ]),
        ),
        const SizedBox(width: 12),
        const Icon(Icons.confirmation_number_rounded, size: 54, color: Colors.white54)
            .animate(onPlay: (c) => c.repeat(reverse: true))
            .rotate(begin: -0.04, end: 0.04, duration: 2.seconds, curve: Curves.easeInOut),
      ]),
    );
  }
}

class SegmentedLevel extends StatelessWidget {
  const SegmentedLevel({super.key, required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), color: p.alt, border: Border.all(color: p.line)),
      child: Row(children: [
        for (final l in kLevels)
          Expanded(
            child: GestureDetector(
              onTap: () => onChanged(l),
              child: AnimatedContainer(
                duration: 220.ms,
                padding: const EdgeInsets.symmetric(vertical: 11),
                alignment: Alignment.center,
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: value == l ? p.pink : Colors.transparent),
                child: Text(l, style: bodyStyle(context, size: 12.5, weight: FontWeight.w700, color: value == l ? Colors.white : p.muted)),
              ),
            ),
          ),
      ]),
    );
  }
}
