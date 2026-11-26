import 'dart:io';

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

/// Committee application: 2 steps (You -> Role) with an animated progress header.
class JoinCommitteeScreen extends StatefulWidget {
  const JoinCommitteeScreen({super.key});

  @override
  State<JoinCommitteeScreen> createState() => _JoinCommitteeScreenState();
}

class _JoinCommitteeScreenState extends State<JoinCommitteeScreen> {
  final _name = TextEditingController();
  final _sid = TextEditingController();
  final _batch = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _note = TextEditingController();
  String _dept = '';
  String _gender = '';
  String _post = '';
  PickedPhoto? _photo;
  int _step = 0;
  bool _busy = false;
  bool _done = false;
  final Map<String, String> _errors = {};

  static const _step0Keys = {'full_name', 'student_id', 'batch', 'department', 'gender', 'photo_url', 'phone', 'email'};

  @override
  void dispose() {
    for (final c in [_name, _sid, _batch, _phone, _email, _note]) {
      c.dispose();
    }
    super.dispose();
  }

  Map<String, String> _validateStep0() {
    final e = <String, String>{};
    if (_photo == null) e['photo_url'] = 'A profile photo is required';
    if (!validName(_name.text)) e['full_name'] = 'Enter your full name';
    if (_sid.text.trim().length < 2) e['student_id'] = 'Student ID is required';
    if (!validBatch(_batch.text)) e['batch'] = 'Enter your batch number, e.g. 14';
    if (_dept.isEmpty) e['department'] = 'Select your department';
    if (!validBdPhone(_phone.text)) e['phone'] = 'Enter a valid BD mobile (01XXXXXXXXX)';
    if (!validEmail(_email.text)) e['email'] = 'Enter a valid email';
    return e;
  }

  Map<String, String> _validateStep1() {
    final e = <String, String>{};
    if (_post.isEmpty) e['post'] = 'Select the post you are applying for';
    return e;
  }

  void _next() {
    final e = _validateStep0();
    setState(() {
      _errors
        ..clear()
        ..addAll(e);
      if (e.isEmpty) _step = 1;
    });
    if (e.isNotEmpty) HapticFeedback.lightImpact();
  }

  Future<void> _submit() async {
    final e = {..._validateStep0(), ..._validateStep1()};
    if (e.isNotEmpty) {
      setState(() {
        _errors
          ..clear()
          ..addAll(e);
        if (e.keys.any(_step0Keys.contains)) _step = 0;
      });
      return;
    }
    setState(() {
      _busy = true;
      _errors.clear();
    });
    final res = await submitJoin(
      context.read<AppState>().api,
      {
        'type': 'committee',
        'full_name': _name.text.trim(),
        'student_id': _sid.text.trim(),
        'batch': _batch.text.trim(),
        'department': _dept,
        'phone': _phone.text.replaceAll(RegExp(r'[\s-]'), ''),
        'email': _email.text.trim(),
        'gender': _gender,
        'post': _post,
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
        if (res.fields.keys.any(_step0Keys.contains)) _step = 0;
      }
    });
    if (!res.ok) showSnack(context, res.message ?? 'Submission failed', error: true);
  }

  Future<void> _choosePhoto() async {
    final ph = await pickPhoto(context, aspect: 1, circle: true);
    if (ph != null && mounted) {
      setState(() {
        _photo = ph;
        _errors.remove('photo_url');
      });
    }
  }

  void _clear(String k) {
    if (_errors.containsKey(k)) setState(() => _errors.remove(k));
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final s = context.watch<AppState>().settings;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: _done
              ? const JoinSuccess(title: 'Application sent!', message: 'Thank you for applying. The committee will review your application and contact you soon.')
              : Column(children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 20, 0),
                    child: JoinTopBar(title: s.pageText('joinCommitteeTitle', 'Committee application'), eyebrow: s.pageText('joinCommitteeTag', 'Executive committee')),
                  ),
                  const Padding(padding: EdgeInsets.fromLTRB(20, 14, 20, 0), child: PromptLine('apply --role=committee')),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
                    child: _Progress(step: _step),
                  ),
                  Expanded(
                    child: AnimatedSwitcher(
                      duration: 350.ms,
                      transitionBuilder: (child, anim) => FadeTransition(
                        opacity: anim,
                        child: SlideTransition(position: Tween(begin: Offset(_step == 1 ? 0.12 : -0.12, 0), end: Offset.zero).animate(anim), child: child),
                      ),
                      child: KeyedSubtree(key: ValueKey(_step), child: _step == 0 ? _stepOne(p) : _stepTwo(p)),
                    ),
                  ),
                  _bottomBar(),
                ]),
        ),
      ),
    );
  }

  Widget _bottomBar() {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 8, 20, 16 + MediaQuery.of(context).viewInsets.bottom * 0),
      child: Row(children: [
        if (_step == 1) ...[
          SizedBox(width: 110, child: GhostButton(label: 'Back', onPressed: _busy ? null : () => setState(() => _step = 0))),
          const SizedBox(width: 12),
        ],
        Expanded(
          child: _step == 0
              ? GradientButton(label: 'Continue', icon: Icons.arrow_forward_rounded, onPressed: _next)
              : GradientButton(label: 'Submit application', icon: Icons.send_rounded, loading: _busy, onPressed: _submit),
        ),
      ]),
    );
  }

  Widget _stepOne(Pal p) {
    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
      children: [
        Text('About you', style: displayStyle(context, 28)),
        const SizedBox(height: 4),
        Text('Start with a clear photo, then your details.', style: bodyStyle(context, color: p.muted, size: 13.5)),
        const SizedBox(height: 22),
        Center(child: PhotoSlot(photo: _photo, onTap: _choosePhoto, error: _errors['photo_url'], label: 'Add photo *')),
        const SizedBox(height: 22),
        AppField(controller: _name, label: 'Full name', error: _errors['full_name'], icon: Icons.person_outline_rounded, textInputAction: TextInputAction.next, onChanged: () => _clear('full_name')),
        const SizedBox(height: 14),
        AppField(controller: _sid, label: 'Student ID', error: _errors['student_id'], icon: Icons.badge_outlined, textInputAction: TextInputAction.next, onChanged: () => _clear('student_id')),
        const SizedBox(height: 14),
        AppField(
          controller: _batch,
          label: 'Batch (e.g. 14)',
          error: _errors['batch'],
          icon: Icons.school_outlined,
          keyboard: TextInputType.number,
          maxLength: 3,
          formatters: [FilteringTextInputFormatter.digitsOnly],
          onChanged: () => _clear('batch'),
        ),
        const SizedBox(height: 14),
        PickerField(label: 'Department', value: _dept, options: kDepartments, error: _errors['department'], icon: Icons.apartment_rounded, onChanged: (v) => setState(() {
          _dept = v;
          _errors.remove('department');
        })),
        const SizedBox(height: 14),
        AppField(
          controller: _phone,
          label: 'Mobile (01XXXXXXXXX)',
          error: _errors['phone'],
          keyboard: TextInputType.phone,
          icon: Icons.call_outlined,
          textInputAction: TextInputAction.next,
          onChanged: () => _clear('phone'),
        ),
        const SizedBox(height: 14),
        AppField(
          controller: _email,
          label: 'Email',
          error: _errors['email'],
          keyboard: TextInputType.emailAddress,
          icon: Icons.alternate_email_rounded,
          textInputAction: TextInputAction.next,
          onChanged: () => _clear('email'),
        ),
        const SizedBox(height: 18),
        ChoiceRow(label: 'Gender (optional)', options: kGenders, value: _gender, onChanged: (v) => setState(() => _gender = v)),
      ],
    );
  }

  Widget _stepTwo(Pal p) {
    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
      children: [
        Text('Your role', style: displayStyle(context, 28)),
        const SizedBox(height: 4),
        Text('Pick the post you want and tell us why.', style: bodyStyle(context, color: p.muted, size: 13.5)),
        const SizedBox(height: 22),
        PickerField(label: 'Post applying for', value: _post, options: kCommitteePosts, error: _errors['post'], icon: Icons.workspace_premium_outlined, onChanged: (v) => setState(() {
          _post = v;
          _errors.remove('post');
        })),
        const SizedBox(height: 14),
        AppField(controller: _note, label: 'Why this post? (optional)', maxLines: 5, maxLength: 600, keyboard: TextInputType.multiline),
        const SizedBox(height: 18),
        GlassCard(
          child: Row(children: [
            ClipOval(
              child: SizedBox(
                width: 46,
                height: 46,
                child: _photo == null ? ColoredBox(color: p.alt) : Image.file(File(_photo!.path), fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_name.text.trim(), style: bodyStyle(context, weight: FontWeight.w700)),
                Text('${_dept.isEmpty ? '' : '$_dept · '}Batch ${_batch.text.trim()}', style: bodyStyle(context, size: 12.5, color: p.muted)),
              ]),
            ),
          ]),
        ),
      ],
    );
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.step});
  final int step;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    const labels = ['You', 'Role'];
    return Row(children: [
      for (var i = 0; i < 2; i++) ...[
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              AnimatedContainer(
                duration: 300.ms,
                width: 22,
                height: 22,
                alignment: Alignment.center,
                decoration: BoxDecoration(shape: BoxShape.circle, gradient: i <= step ? p.brand : null, color: i <= step ? null : p.alt),
                child: i < step
                    ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
                    : Text('${i + 1}', style: monoStyle(context, size: 10, color: i <= step ? Colors.white : p.muted, weight: FontWeight.w700)),
              ),
              const SizedBox(width: 8),
              Text(labels[i].toUpperCase(), style: monoStyle(context, size: 10.5, color: i <= step ? p.fg : p.muted)),
            ]),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: i <= step ? 1 : 0),
                duration: 400.ms,
                curve: Curves.easeOutCubic,
                builder: (context, v, _) => LinearProgressIndicator(value: v, minHeight: 4, color: p.tech, backgroundColor: p.line),
              ),
            ),
          ]),
        ),
        if (i == 0) const SizedBox(width: 12),
      ],
    ]);
  }
}
