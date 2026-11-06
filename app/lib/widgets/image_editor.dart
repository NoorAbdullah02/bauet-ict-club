import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';

/// What the person did to the picture. Both the live preview and the saved file are drawn from this.
class EditState {
  int quarter = 0; // 90 degree turns
  bool flip = false;
  double zoom = 1;
  Offset pan = Offset.zero;
  double brightness = 0; // -0.4 .. 0.4
  double contrast = 1; // 0.6 .. 1.6
  double saturation = 1; // 0 .. 2

  ui.ColorFilter get filter {
    const lr = 0.2126, lg = 0.7152, lb = 0.0722;
    final s = saturation, c = contrast;
    final t = 255 * (0.5 * (1 - c) + brightness);
    return ui.ColorFilter.matrix(<double>[
      c * (lr * (1 - s) + s), c * lg * (1 - s), c * lb * (1 - s), 0, t, //
      c * lr * (1 - s), c * (lg * (1 - s) + s), c * lb * (1 - s), 0, t, //
      c * lr * (1 - s), c * lg * (1 - s), c * (lb * (1 - s) + s), 0, t, //
      0, 0, 0, 1, 0,
    ]);
  }
}

Size _turned(ui.Image i, int quarter) => quarter.isOdd ? Size(i.height.toDouble(), i.width.toDouble()) : Size(i.width.toDouble(), i.height.toDouble());

/// How far the picture may be moved before the crop frame would show empty space.
Offset _maxPan(ui.Image i, Size frame, EditState s) {
  final r = _turned(i, s.quarter);
  final base = math.max(frame.width / r.width, frame.height / r.height);
  final k = base * s.zoom;
  return Offset(math.max(0, (r.width * k - frame.width) / 2), math.max(0, (r.height * k - frame.height) / 2));
}

Offset _clampPan(ui.Image i, Size frame, EditState s) {
  final m = _maxPan(i, frame, s);
  return Offset(s.pan.dx.clamp(-m.dx, m.dx), s.pan.dy.clamp(-m.dy, m.dy));
}

/// Draws the edited picture into a [frame]-sized area (white behind, in case the picture has see-through parts).
void paintEdit(Canvas canvas, Size frame, ui.Image image, EditState s) {
  canvas.drawRect(Offset.zero & frame, Paint()..color = Colors.white);
  final r = _turned(image, s.quarter);
  final base = math.max(frame.width / r.width, frame.height / r.height);
  final k = base * s.zoom;
  canvas.save();
  canvas.clipRect(Offset.zero & frame);
  canvas.translate(frame.width / 2 + s.pan.dx, frame.height / 2 + s.pan.dy);
  canvas.rotate(s.quarter * math.pi / 2);
  canvas.scale(s.flip ? -k : k, k);
  canvas.drawImage(image, Offset(-image.width / 2, -image.height / 2), Paint()..colorFilter = s.filter..filterQuality = FilterQuality.high);
  canvas.restore();
}

class _EditPainter extends CustomPainter {
  _EditPainter(this.image, this.state, this.tick);
  final ui.Image image;
  final EditState state;
  final int tick; // changes on every edit so the picture is redrawn
  @override
  void paint(Canvas canvas, Size size) => paintEdit(canvas, size, image, state);
  @override
  bool shouldRepaint(_EditPainter old) => old.tick != tick || old.image != image;
}

Uint8List _encodeJpeg((Uint8List, int, int, int) a) {
  final im = img.Image.fromBytes(width: a.$2, height: a.$3, bytes: a.$1.buffer, numChannels: 4);
  return Uint8List.fromList(img.encodeJpg(im, quality: a.$4));
}

const List<(String, double?)> _kShapes = [('Free', null), ('1:1', 1), ('4:3', 4 / 3), ('16:9', 16 / 9), ('3:4', 3 / 4)];
const List<(String, int)> _kSizes = [('Small', 640), ('Medium', 1000), ('Large', 1600), ('HD', 2400)];
const List<(String, double, double, double)> _kLooks = [
  ('Original', 0, 1, 1),
  ('Vivid', 0.02, 1.12, 1.45),
  ('Bright', 0.12, 1.05, 1.1),
  ('Soft', 0.05, 0.88, 0.9),
  ('Mono', 0, 1.1, 0),
  ('Punch', -0.02, 1.3, 1.25),
];

/// Full-screen editor: crop (drag and pinch), turn, flip, brightness / contrast / colour, a few looks and the output size.
/// Returns the finished JPEG, or null when the person cancels. [aspect] fixes the crop shape (for example 1 for profile pictures).
Future<Uint8List?> editImage(BuildContext context, Uint8List bytes, {double? aspect, bool circle = false, int maxSide = 1600}) {
  return Navigator.of(context).push<Uint8List>(MaterialPageRoute(fullscreenDialog: true, builder: (_) => ImageEditorScreen(bytes: bytes, aspect: aspect, circle: circle, maxSide: maxSide)));
}

class ImageEditorScreen extends StatefulWidget {
  const ImageEditorScreen({super.key, required this.bytes, this.aspect, this.circle = false, this.maxSide = 1600});
  final Uint8List bytes;
  final double? aspect;
  final bool circle;
  final int maxSide;

  @override
  State<ImageEditorScreen> createState() => _ImageEditorScreenState();
}

class _ImageEditorScreenState extends State<ImageEditorScreen> {
  ui.Image? _image;
  String? _error;
  final EditState _s = EditState();
  int _tick = 0;
  double? _shape; // null = the picture's own shape
  late int _size = widget.maxSide;
  String _look = 'Original';
  bool _saving = false;
  Size _frame = const Size(300, 300);

  @override
  void initState() {
    super.initState();
    _shape = widget.aspect;
    _decode();
  }

  Future<void> _decode() async {
    try {
      final buffer = await ui.ImmutableBuffer.fromUint8List(widget.bytes);
      final desc = await ui.ImageDescriptor.encoded(buffer);
      final big = math.max(desc.width, desc.height);
      final codec = await desc.instantiateCodec(targetWidth: big > 3200 ? (desc.width >= desc.height ? 3200 : null) : null, targetHeight: big > 3200 ? (desc.height > desc.width ? 3200 : null) : null);
      final frame = await codec.getNextFrame();
      if (mounted) setState(() => _image = frame.image);
    } catch (_) {
      if (mounted) setState(() => _error = 'This picture cannot be opened. Choose a JPG or PNG.');
    }
  }

  void _touch() => setState(() => _tick++);

  double get _frameAspect {
    final i = _image!;
    return _shape ?? (_turned(i, _s.quarter).width / _turned(i, _s.quarter).height);
  }

  void _apply(Offset delta, double zoom) {
    _s.zoom = zoom.clamp(1.0, 6.0);
    _s.pan = _s.pan + delta;
    _s.pan = _clampPan(_image!, _frame, _s);
    _touch();
  }

  double _startZoom = 1;

  Future<void> _done() async {
    final image = _image;
    if (image == null || _saving) return;
    setState(() => _saving = true);
    try {
      final a = _frameAspect;
      final outW = (a >= 1 ? _size : _size * a).round();
      final outH = (a >= 1 ? _size / a : _size).round();
      final k = outW / _frame.width;
      final rec = ui.PictureRecorder();
      final canvas = Canvas(rec)..scale(k);
      // keep the same framing: the pan is stored in preview pixels
      paintEdit(canvas, Size(_frame.width, _frame.width / a), image, _s);
      final pic = rec.endRecording();
      final out = await pic.toImage(outW, outH);
      final data = await out.toByteData(format: ui.ImageByteFormat.rawRgba);
      if (data == null) throw StateError('no data');
      final jpg = await compute(_encodeJpeg, (data.buffer.asUint8List(), outW, outH, 88));
      if (mounted) Navigator.of(context).pop(jpg);
    } catch (_) {
      if (mounted) {
        setState(() => _saving = false);
        showSnack(context, 'Could not save the picture. Try again.', error: true);
      }
    }
  }

  void _reset() {
    _s
      ..quarter = 0
      ..flip = false
      ..zoom = 1
      ..pan = Offset.zero
      ..brightness = 0
      ..contrast = 1
      ..saturation = 1;
    _look = 'Original';
    _shape = widget.aspect;
    _touch();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F1C),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0F1C),
        foregroundColor: Colors.white,
        title: const Text('Edit picture'),
        leading: IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.of(context).pop()),
        actions: [
          TextButton(onPressed: _image == null || _saving ? null : _reset, child: const Text('Reset')),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilledButton.icon(onPressed: _image == null || _saving ? null : _done, icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check_rounded), label: const Text('Done')),
          ),
        ],
      ),
      body: _error != null
          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, style: const TextStyle(color: Colors.white70), textAlign: TextAlign.center)))
          : _image == null
              ? const Center(child: CircularProgressIndicator())
              : SafeArea(child: _editor(context, p)),
    );
  }

  Widget _editor(BuildContext context, Pal p) {
    final image = _image!;
    return Column(children: [
      Expanded(
        child: LayoutBuilder(builder: (context, c) {
          final a = _frameAspect;
          final maxW = c.maxWidth - 32, maxH = c.maxHeight - 16;
          var w = maxW, h = w / a;
          if (h > maxH) {
            h = maxH;
            w = h * a;
          }
          final newFrame = Size(w, h);
          if (newFrame != _frame) {
            _frame = newFrame;
            _s.pan = _clampPan(image, _frame, _s);
          }
          return Center(
            child: GestureDetector(
              onScaleStart: (d) => _startZoom = _s.zoom,
              onScaleUpdate: (d) => _apply(d.focalPointDelta, _startZoom * d.scale),
              child: SizedBox(
                width: w,
                height: h,
                child: Stack(fit: StackFit.expand, children: [
                  ClipRRect(borderRadius: BorderRadius.circular(widget.circle ? w : 12), child: CustomPaint(painter: _EditPainter(image, _s, _tick))),
                  IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(shape: widget.circle ? BoxShape.circle : BoxShape.rectangle, borderRadius: widget.circle ? null : BorderRadius.circular(12), border: Border.all(color: Colors.white70, width: 2)))),
                ]),
              ),
            ),
          );
        }),
      ),
      const Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Text('Drag to move · pinch to zoom', style: TextStyle(color: Colors.white54, fontSize: 12))),
      Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.36),
        decoration: const BoxDecoration(color: Color(0xFF131A2E), borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 16), shrinkWrap: true, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            _tool(Icons.rotate_left_rounded, 'Turn left', () {
              _s.quarter = (_s.quarter + 3) % 4;
              _s.pan = Offset.zero;
              _touch();
            }),
            _tool(Icons.rotate_right_rounded, 'Turn right', () {
              _s.quarter = (_s.quarter + 1) % 4;
              _s.pan = Offset.zero;
              _touch();
            }),
            _tool(Icons.flip_rounded, 'Flip', () {
              _s.flip = !_s.flip;
              _touch();
            }),
            _tool(Icons.zoom_out_map_rounded, 'Fit', () {
              _s.zoom = 1;
              _s.pan = Offset.zero;
              _touch();
            }),
          ]),
          if (widget.aspect == null) ...[
            _label('Shape'),
            Wrap(spacing: 8, children: [for (final o in _kShapes) ChoiceChip(label: Text(o.$1 == 'Free' ? 'Original' : o.$1), selected: _shape == o.$2, onSelected: (_) => setState(() {
                  _shape = o.$2;
                  _s.pan = Offset.zero;
                  _tick++;
                }))]),
          ],
          _label('Look'),
          Wrap(spacing: 8, runSpacing: 4, children: [
            for (final o in _kLooks)
              ChoiceChip(label: Text(o.$1), selected: _look == o.$1, onSelected: (_) {
                _look = o.$1;
                _s
                  ..brightness = o.$2
                  ..contrast = o.$3
                  ..saturation = o.$4;
                _touch();
              }),
          ]),
          _slider('Brightness', _s.brightness, -0.4, 0.4, (v) => _s.brightness = v),
          _slider('Contrast', _s.contrast, 0.6, 1.6, (v) => _s.contrast = v),
          _slider('Colour', _s.saturation, 0, 2, (v) => _s.saturation = v),
          _label('Size'),
          Wrap(spacing: 8, children: [for (final o in _kSizes) ChoiceChip(label: Text('${o.$1} · ${o.$2}px'), selected: _size == o.$2, onSelected: (_) => setState(() => _size = o.$2))]),
        ]),
      ),
    ]);
  }

  Widget _label(String t) => Padding(padding: const EdgeInsets.only(top: 14, bottom: 6), child: Text(t.toUpperCase(), style: const TextStyle(color: Colors.white54, fontSize: 11, letterSpacing: 1.2)));

  Widget _tool(IconData icon, String label, VoidCallback onTap) => InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(8), child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(icon, color: Colors.white), const SizedBox(height: 4), Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11))])),
      );

  Widget _slider(String label, double v, double lo, double hi, void Function(double) set) => Row(children: [
        SizedBox(width: 84, child: Text(label, style: const TextStyle(color: Colors.white70, fontSize: 13))),
        Expanded(child: Slider(value: v.clamp(lo, hi), min: lo, max: hi, onChanged: (x) {
          set(x);
          _look = '';
          _touch();
        })),
      ]);
}

/// Pick a picture (gallery or camera), let the person edit it, and save the result as a JPEG in the phone's temp folder.
Future<({String path, String name, String mime})?> pickAndEdit(BuildContext context, {double? aspect, bool circle = false, int maxSide = 1600}) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    showDragHandle: true,
    builder: (ctx) => SafeArea(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        ListTile(leading: const Icon(Icons.photo_library_rounded), title: const Text('Choose from gallery'), onTap: () => Navigator.pop(ctx, ImageSource.gallery)),
        ListTile(leading: const Icon(Icons.photo_camera_rounded), title: const Text('Take a photo'), onTap: () => Navigator.pop(ctx, ImageSource.camera)),
      ]),
    ),
  );
  if (source == null || !context.mounted) return null;
  try {
    final x = await ImagePicker().pickImage(source: source, maxWidth: 3200, maxHeight: 3200, imageQuality: 95);
    if (x == null || !context.mounted) return null;
    final bytes = await x.readAsBytes();
    if (!context.mounted) return null;
    final edited = await editImage(context, bytes, aspect: aspect, circle: circle, maxSide: maxSide);
    if (edited == null) return null;
    final dir = await getTemporaryDirectory();
    final name = 'picture_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final path = '${dir.path}${Platform.pathSeparator}$name';
    await File(path).writeAsBytes(edited, flush: true);
    return (path: path, name: name, mime: 'image/jpeg');
  } catch (_) {
    if (context.mounted) showSnack(context, 'Could not open the picture', error: true);
    return null;
  }
}
