import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../data/api.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/coder.dart';
import '../widgets/common.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<ChatMessage> _messages = [
    ChatMessage('assistant', 'Hi! I am the BAUET ICT Club assistant. Ask me about events, joining, the committee or anything about the club.'),
  ];
  bool _typing = false;

  static const _suggestions = [
    'How do I join the club?',
    'What events are coming up?',
    'Who is in the committee?',
    'What do you teach?',
  ];

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _toBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent, duration: 300.ms, curve: Curves.easeOut);
      }
    });
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _input.text).trim();
    if (text.isEmpty || _typing) return;
    final history = _messages
        .skip(1)
        .toList()
        .reversed
        .take(10)
        .toList()
        .reversed
        .map((m) => {'role': m.role, 'content': m.content})
        .toList();
    setState(() {
      _messages.add(ChatMessage('user', text));
      _typing = true;
      _input.clear();
    });
    _toBottom();
    String reply;
    try {
      reply = await context.read<AppState>().api.chat(text, history);
      if (reply.isEmpty) reply = 'Sorry, I could not come up with an answer.';
    } on ApiException catch (e) {
      reply = 'Something went wrong: ${e.message}';
    } catch (_) {
      reply = 'Something went wrong. Please try again.';
    }
    if (!mounted) return;
    setState(() {
      _messages.add(ChatMessage('assistant', reply));
      _typing = false;
    });
    _toBottom();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final showSuggestions = _messages.length == 1;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(children: [
                IconButton(onPressed: () => context.canPop() ? context.pop() : context.go('/home'), icon: const Icon(Icons.arrow_back_rounded)),
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand),
                  child: const Padding(padding: EdgeInsets.all(8), child: ChatFace(size: 24)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('ICT Assistant', style: displayStyle(context, 19)),
                    Row(children: [
                      Container(width: 7, height: 7, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF34D399))),
                      const SizedBox(width: 6),
                      Text('ONLINE', style: monoStyle(context, size: 9.5)),
                    ]),
                  ]),
                ),
                IconButton(
                  tooltip: 'Clear chat',
                  onPressed: () => setState(() => _messages.removeRange(1, _messages.length)),
                  icon: Icon(Icons.delete_sweep_outlined, color: p.muted),
                ),
              ]),
            ),
            Divider(height: 1, color: p.line),
            Expanded(
              child: ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                itemCount: _messages.length + (_typing ? 1 : 0) + (showSuggestions ? 1 : 0),
                itemBuilder: (context, i) {
                  if (i < _messages.length) return _Bubble(message: _messages[i]);
                  final extra = i - _messages.length;
                  if (showSuggestions && extra == 0) {
                    return Padding(
                      padding: const EdgeInsets.only(top: 10, left: 42),
                      child: Wrap(spacing: 8, runSpacing: 8, children: [
                        for (var s = 0; s < _suggestions.length; s++)
                          ActionChip(
                            label: Text(_suggestions[s], style: bodyStyle(context, size: 12.5, weight: FontWeight.w600)),
                            backgroundColor: p.surface,
                            side: BorderSide(color: p.line),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(99)),
                            onPressed: () => _send(_suggestions[s]),
                          ).animate().fadeIn(delay: (120 * s).ms).slideX(begin: 0.1, end: 0),
                      ]),
                    );
                  }
                  return const _TypingDots();
                },
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              decoration: BoxDecoration(color: p.surface.withValues(alpha: 0.9), border: Border(top: BorderSide(color: p.line))),
              child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                    style: bodyStyle(context),
                    cursorColor: p.tech,
                    decoration: const InputDecoration(hintText: 'Ask anything about the club...'),
                  ),
                ),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: _send,
                  child: Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand),
                    child: const Icon(Icons.arrow_upward_rounded, color: Colors.white),
                  ),
                ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});
  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final user = message.isUser;
    final radius = BorderRadius.only(
      topLeft: const Radius.circular(20),
      topRight: const Radius.circular(20),
      bottomLeft: Radius.circular(user ? 20 : 5),
      bottomRight: Radius.circular(user ? 5 : 20),
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: user ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!user) ...[
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand),
              child: const Padding(padding: EdgeInsets.all(5), child: ChatFace(size: 20)),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                decoration: BoxDecoration(
                  borderRadius: radius,
                  gradient: user ? p.brand : null,
                  color: user ? null : p.surface,
                  border: user ? null : Border.all(color: p.line),
                ),
                child: SelectableText(message.content, style: bodyStyle(context, color: user ? Colors.white : p.fg, size: 14.5)),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.15, end: 0, duration: 350.ms, curve: Curves.easeOutCubic);
  }
}

class _TypingDots extends StatelessWidget {
  const _TypingDots();

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(left: 38, bottom: 12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: BoxDecoration(color: p.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: p.line)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            for (var i = 0; i < 3; i++)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(shape: BoxShape.circle, color: p.tech),
              )
                  .animate(onPlay: (c) => c.repeat(reverse: true), delay: (160 * i).ms)
                  .moveY(begin: 0, end: -6, duration: 420.ms, curve: Curves.easeInOut)
                  .fade(begin: 0.4, end: 1, duration: 420.ms),
          ]),
        ),
      ),
    );
  }
}
