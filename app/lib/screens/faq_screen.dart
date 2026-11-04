import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/app_state.dart';
import '../widgets/coder.dart';
import '../widgets/common.dart';
import '../widgets/newsletter.dart';

class FaqScreen extends StatelessWidget {
  const FaqScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = context.pal;
    return RefreshIndicator(
      color: p.tech,
      onRefresh: state.loadAll,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Help', title: 'FAQ', subtitle: 'Quick answers about the club.').stagger(0),
          const SizedBox(height: 18),
          if (state.loading && !state.loadedOnce)
            const ShimmerList(count: 4, height: 70)
          else if (state.error != null && state.faqs.isEmpty)
            ErrorState(message: state.error!, onRetry: state.loadAll)
          else if (state.faqs.isEmpty)
            const EmptyState(icon: Icons.help_outline_rounded, title: 'No questions yet')
          else
            for (var i = 0; i < state.faqs.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: GlassCard(
                  padding: EdgeInsets.zero,
                  radius: 20,
                  child: Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 2),
                      childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 16),
                      expandedCrossAxisAlignment: CrossAxisAlignment.start,
                      iconColor: p.tech,
                      collapsedIconColor: p.muted,
                      title: Text(state.faqs[i].question, style: bodyStyle(context, weight: FontWeight.w700, size: 15)),
                      children: [Text(state.faqs[i].answer, style: bodyStyle(context, color: p.muted, size: 14))],
                    ),
                  ),
                ).stagger(i),
              ),
          const SizedBox(height: 20),
          const CodeLabel('still curious?'),
          const SizedBox(height: 10),
          const NewsletterBox(),
        ],
      ),
    );
  }
}
