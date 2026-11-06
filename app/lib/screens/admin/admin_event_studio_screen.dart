import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/publish_picker.dart';
import 'admin_page.dart';
import 'admin_widgets.dart';

/// Event Studio: everything about a new event on ONE page. Details, how people register, seats, when to publish. Then straight to the sign-up form.
class AdminEventStudioScreen extends StatefulWidget {
  const AdminEventStudioScreen({super.key});

  @override
  State<AdminEventStudioScreen> createState() => _AdminEventStudioScreenState();
}

class _AdminEventStudioScreenState extends State<AdminEventStudioScreen> {
  late final AppState _state = context.read<AppState>();
  final _title = TextEditingController();
  final _date = TextEditingController();
  final _time = TextEditingController();
  final _where = TextEditingController();
  final _category = TextEditingController();
  final _desc = TextEditingController();
  final _image = TextEditingController();
  final _seats = TextEditingController();
  final _link = TextEditingController();
  final _pub = PublishController();
  String _mode = 'club'; // club = the form built in the app, link = Google Form or any other web link
  bool _regOpen = true;
  bool _featured = false;
  bool _busy = false;
  final Map<String, String> _errors = {};

  @override
  void initState() {
    super.initState();
    final n = DateTime.now().toUtc().add(const Duration(hours: 6));
    String two(int v) => v.toString().padLeft(2, '0');
    _date.text = '${n.year}-${two(n.month)}-${two(n.day)}';
  }

  @override
  void dispose() {
    for (final c in [_title, _date, _time, _where, _category, _desc, _image, _seats, _link]) {
      c.dispose();
    }
    _pub.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final initial = DateTime.tryParse(_date.text) ?? DateTime.now();
    final d = await showDatePicker(context: context, initialDate: initial, firstDate: DateTime(2015), lastDate: DateTime(2100));
    if (d == null) return;
    String two(int v) => v.toString().padLeft(2, '0');
    setState(() => _date.text = '${d.year}-${two(d.month)}-${two(d.day)}');
  }

  Future<void> _create({required bool withForm}) async {
    final errs = <String, String>{};
    if (_title.text.trim().isEmpty) errs['title'] = 'Give the event a title';
    if (_date.text.trim().isEmpty) errs['date'] = 'Choose the date';
    if (_mode == 'link') {
      final u = Uri.tryParse(_link.text.trim());
      if (u == null || !(u.scheme == 'http' || u.scheme == 'https') || u.host.isEmpty) errs['link'] = 'Paste the full form link, starting with https://';
    }
    setState(() {
      _errors
        ..clear()
        ..addAll(errs);
    });
    if (errs.isNotEmpty) return;
    setState(() => _busy = true);
    try {
      final body = <String, dynamic>{
        'title': _title.text.trim(),
        'date': _date.text.trim(),
        'time': _time.text.trim(),
        'location': _where.text.trim(),
        'category': _category.text.trim(),
        'description': _desc.text.trim(),
        'image_url': _image.text.trim(),
        'featured': _featured,
        'reg_open': _regOpen,
        'capacity': _mode == 'club' ? (int.tryParse(_seats.text.trim()) ?? 0) : 0,
        'reg_url': _mode == 'link' ? _link.text.trim() : '',
        ..._pub.toBody(),
      };
      final made = await _state.api.createReturning('events', body);
      if (!mounted) return;
      showSnack(context, withForm ? 'Event created: now build its sign-up form' : 'Event created');
      if (withForm && _mode == 'club') {
        context.pushReplacement('/admin/event-form/${made['id']}');
      } else {
        context.pop();
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _section(BuildContext context, IconData icon, String title, List<Widget> children) {
    final p = context.pal;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Icon(icon, size: 20, color: p.tech), const SizedBox(width: 8), Text(title, style: bodyStyle(context, weight: FontWeight.w800, size: 16))]),
          const SizedBox(height: 14),
          ...children,
        ]),
      ),
    );
  }

  Widget _modeCard(BuildContext context, String key, IconData icon, String title, String text) {
    final p = context.pal;
    final on = _mode == key;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => setState(() => _mode = key),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: on ? p.tech : p.line, width: 2), color: on ? p.tech.withValues(alpha: 0.08) : null),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(borderRadius: BorderRadius.circular(13), color: on ? p.tech : p.alt), child: Icon(icon, color: on ? Colors.white : p.muted, size: 20)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: bodyStyle(context, weight: FontWeight.w700)), const SizedBox(height: 2), Text(text, style: bodyStyle(context, size: 12.5, color: p.muted))])),
            if (on) Icon(Icons.check_circle_rounded, color: p.tech, size: 20),
          ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AdminPage(
      title: 'New event',
      children: [
        _section(context, Icons.event_rounded, 'About the event', [
          AppField(controller: _title, label: 'Title *', icon: Icons.title_rounded, error: _errors['title']),
          const SizedBox(height: 12),
          GestureDetector(onTap: _pickDate, child: AbsorbPointer(child: AppField(controller: _date, label: 'Date *', icon: Icons.calendar_month_rounded, error: _errors['date']))),
          const SizedBox(height: 12),
          AppField(controller: _time, label: 'Time (e.g. 10:00 AM)', icon: Icons.schedule_rounded),
          const SizedBox(height: 12),
          AppField(controller: _where, label: 'Location', icon: Icons.place_outlined),
          const SizedBox(height: 12),
          AppField(controller: _category, label: 'Category (Workshop, Seminar…)', icon: Icons.category_outlined),
          const SizedBox(height: 12),
          AppField(controller: _desc, label: 'Description', icon: Icons.notes_rounded, maxLines: 5, keyboard: TextInputType.multiline),
          const SizedBox(height: 12),
          ImageUploadField(controller: _image, label: 'Picture (optional)'),
          SwitchListTile(contentPadding: EdgeInsets.zero, title: Text('Featured', style: bodyStyle(context, weight: FontWeight.w600)), value: _featured, onChanged: (v) => setState(() => _featured = v)),
        ]),
        _section(context, Icons.how_to_reg_rounded, 'How do people register?', [
          _modeCard(context, 'club', Icons.assignment_rounded, 'Club form', 'Build the form here. Seat limit, bKash or online payment, ticket with QR code and check-in all work.'),
          _modeCard(context, 'link', Icons.link_rounded, 'Google Form or other link', 'People tap "Register now" and go straight to your own form.'),
          SwitchListTile(contentPadding: EdgeInsets.zero, title: Text('Registration open', style: bodyStyle(context, weight: FontWeight.w600)), value: _regOpen, onChanged: (v) => setState(() => _regOpen = v)),
          if (_mode == 'club') AppField(controller: _seats, label: 'Seats (leave empty for no limit)', icon: Icons.event_seat_outlined, keyboard: TextInputType.number),
          if (_mode == 'link') AppField(controller: _link, label: 'Form link (https://…)', icon: Icons.link_rounded, keyboard: TextInputType.url, error: _errors['link']),
        ]),
        _section(context, Icons.rocket_launch_rounded, 'Publish', [PublishPicker(controller: _pub)]),
        if (_mode == 'club') GradientButton(label: 'Create and build the sign-up form', icon: Icons.arrow_forward_rounded, loading: _busy, onPressed: () => _create(withForm: true)),
        if (_mode == 'club') const SizedBox(height: 10),
        _mode == 'club'
            ? GhostButton(label: 'Create the event only', icon: Icons.check_rounded, onPressed: _busy ? null : () => _create(withForm: false))
            : GradientButton(label: 'Create the event', icon: Icons.check_rounded, loading: _busy, onPressed: () => _create(withForm: false)),
      ],
    );
  }
}
