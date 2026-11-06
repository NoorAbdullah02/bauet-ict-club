import 'package:flutter/material.dart';

import '../core/theme.dart';
import 'common.dart';

/// Holds the "when to publish" choice of an event or notice: now, at a time (Bangladesh time) or as a draft.
class PublishController extends ChangeNotifier {
  PublishController([Map<String, dynamic>? row]) {
    final at = DateTime.tryParse('${row?['publish_at'] ?? ''}');
    if (row?['is_draft'] == true) {
      mode = 'draft';
    } else if (at != null) {
      mode = 'schedule';
      this.at = at.toUtc().add(const Duration(hours: 6)); // the wall clock in Bangladesh, kept in a UTC DateTime
    }
  }

  String mode = 'now'; // now | schedule | draft
  DateTime? at;

  void setMode(String m) {
    mode = m;
    if (m == 'schedule') at ??= DateTime.now().toUtc().add(const Duration(hours: 6 + 24));
    notifyListeners();
  }

  void setAt(DateTime v) {
    at = v;
    notifyListeners();
  }

  /// The two fields the server expects.
  Map<String, dynamic> toBody() => {
        'is_draft': mode == 'draft',
        'publish_at': mode == 'schedule' && at != null ? at!.subtract(const Duration(hours: 6)).toIso8601String() : null,
      };
}

class PublishPicker extends StatelessWidget {
  const PublishPicker({super.key, required this.controller});
  final PublishController controller;

  Future<void> _pick(BuildContext context) async {
    final base = controller.at ?? DateTime.now().toUtc().add(const Duration(hours: 6 + 24));
    final d = await showDatePicker(context: context, initialDate: DateTime(base.year, base.month, base.day), firstDate: DateTime.now().subtract(const Duration(days: 1)), lastDate: DateTime(2100));
    if (d == null || !context.mounted) return;
    final t = await showTimePicker(context: context, initialTime: TimeOfDay(hour: base.hour, minute: base.minute));
    if (t == null) return;
    controller.setAt(DateTime.utc(d.year, d.month, d.day, t.hour, t.minute));
  }

  String _label() {
    final a = controller.at;
    if (a == null) return 'Pick date and time';
    String two(int n) => n.toString().padLeft(2, '0');
    return '${a.year}-${two(a.month)}-${two(a.day)}  ${two(a.hour)}:${two(a.minute)}  (Bangladesh time)';
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        Widget chip(String mode, String label) => ChoiceChip(label: Text(label), selected: controller.mode == mode, onSelected: (_) => controller.setMode(mode));
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('When to publish', style: bodyStyle(context, weight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [chip('now', 'Publish now'), chip('schedule', 'Schedule'), chip('draft', 'Save as draft')]),
          if (controller.mode == 'schedule') ...[
            const SizedBox(height: 10),
            GhostButton(label: _label(), icon: Icons.schedule_rounded, onPressed: () => _pick(context)),
            const SizedBox(height: 6),
            Text('It appears on the website and in the app by itself at that moment, and the subscribers get the e-mail then.', style: bodyStyle(context, size: 12, color: p.muted)),
          ],
          if (controller.mode == 'draft') ...[
            const SizedBox(height: 6),
            Text('Only admins can see a draft. Choose "Publish now" when it is ready.', style: bodyStyle(context, size: 12, color: p.muted)),
          ],
        ]);
      },
    );
  }
}
