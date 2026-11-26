import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../state/app_state.dart';
import '../../widgets/coder.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'join_common.dart';

/// Department ambassador application: photo, department card, details, note.
class JoinAmbassadorScreen extends StatefulWidget {
  const JoinAmbassadorScreen({super.key});

  @override
  State<JoinAmbassadorScreen> createState() => _JoinAmbassadorScreenState();
}

class _JoinAmbassadorScreenState extends State<JoinAmbassadorScreen> {
  final _name = TextEditingController();
  final _sid = TextEditingController();
  final _batch = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _note = TextEditingController();
  String _dept = '';
  String _gender = '';
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

  Future<void> _submit() async {
    final e = <String, String>{};
    if (_photo == null) e['photo_url'] = 'A profile photo is required';
    if (_dept.isEmpty || !kAmbassadorDepartments.contains(_dept)) e['department'] = 'Choose your department';
    if (!validName(_name.text)) e['full_name'] = 'Enter your full name';
    if (_sid.text.trim().length < 2) e['student_id'] = 'Student ID is required';
    if (!validBatch(_batch.text)) e['batch'] = 'Enter your batch number, e.g. 14';
    if (!validBdPhone(_phone.text)) e['phone'] = 'Enter a valid BD mobile (01XXXXXXXXX)';
    if (!validEmail(_email.text)) e['email'] = 'Enter a valid email';
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
        'type': 'ambassador',
        'full_name': _name.text.trim(),
        'student_id': _sid.text.trim(),
        'batch': _batch.text.trim(),
        'department': _dept,
        'phone': _phone.text.replaceAll(RegExp(r'[\s-]'), ''),
        'email': _email.text.trim(),
        'gender': _gender,
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
    final s = context.watch<AppState>().settings;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: _done
              ? const JoinSuccess(title: 'Application sent!', message: 'Thanks for stepping up. The committee will review your ambassador application soon.')
              : ListView(
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
                  children: [
                    JoinTopBar(title: s.pageText('joinAmbassadorTitle', 'Department ambassador'), eyebrow: s.pageText('joinAmbassadorTag', 'Be the voice')),
                    const SizedBox(height: 14),
                    const PromptLine('apply --role=ambassador').stagger(0),
                    const SizedBox(height: 18),
                    Center(child: PhotoSlot(photo: _photo, error: _errors['photo_url'], label: 'Add photo *', onTap: () async {
                      final ph = await pickPhoto(context, aspect: 1, circle: true);
                      if (ph != null && mounted) {
                        setState(() {
                          _photo = ph;
                          _errors.remove('photo_url');
                        });
                      }
                    })).stagger(1),
                    const SizedBox(height: 22),
                    const CodeLabel('your department *'),
                    const SizedBox(height: 10),
                    Wrap(spacing: 10, runSpacing: 10, children: [
                      for (final d in kAmbassadorDepartments)
                        _DeptCard(
                          dept: d,
                          selected: _dept == d,
                          onTap: () => setState(() {
                            _dept = d;
                            _errors.remove('department');
                            HapticFeedback.selectionClick();
                          }),
                        ),
                    ]).stagger(2),
                    if (_errors['department'] != null)
                      Padding(padding: const EdgeInsets.only(top: 6), child: Text(_errors['department']!, style: bodyStyle(context, size: 12, color: const Color(0xFFEF4444)))),
                    const SizedBox(height: 20),
                    GlassCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const CodeLabel('your details'),
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
                        AppField(controller: _phone, label: 'Mobile (01XXXXXXXXX)', error: _errors['phone'], keyboard: TextInputType.phone, icon: Icons.call_outlined, textInputAction: TextInputAction.next, onChanged: () => _clear('phone')),
                        const SizedBox(height: 14),
                        AppField(controller: _email, label: 'Email', error: _errors['email'], keyboard: TextInputType.emailAddress, icon: Icons.alternate_email_rounded, textInputAction: TextInputAction.next, onChanged: () => _clear('email')),
                        const SizedBox(height: 16),
                        ChoiceRow(label: 'Gender (optional)', options: kGenders, value: _gender, onChanged: (v) => setState(() => _gender = v)),
                      ]),
                    ).stagger(3),
                    const SizedBox(height: 16),
                    AppField(controller: _note, label: 'Why you? (optional)', maxLines: 4, maxLength: 600, keyboard: TextInputType.multiline),
                    const SizedBox(height: 22),
                    GradientButton(label: 'Apply as ambassador', icon: Icons.school_rounded, loading: _busy, colors: [p.tech, p.gradient.first], onPressed: _submit),
                  ],
                ),
        ),
      ),
    );
  }
}

class _DeptCard extends StatelessWidget {
  const _DeptCard({required this.dept, required this.selected, required this.onTap});
  final String dept;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        width: 96,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: selected ? p.tech.withValues(alpha: 0.18) : p.surface,
          border: Border.all(color: selected ? p.tech : p.line, width: selected ? 1.6 : 1),
        ),
        child: Column(children: [
          Icon(Icons.memory_rounded, color: selected ? p.tech : p.muted),
          const SizedBox(height: 6),
          Text(dept, style: displayStyle(context, 18, color: selected ? p.fg : p.muted)),
        ]),
      ),
    );
  }
}
