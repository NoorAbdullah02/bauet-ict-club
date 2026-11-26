import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../core/i18n.dart';
import '../core/theme.dart';
import '../core/utils.dart';

/// What the person did to the picture. Both the live preview and the saved file are drawn from this.
class EditState {
  int quarter = 0; // 90 degree turns
  bool flip = false;
  bool flipY = false;
  double zoom = 1;
  Offset pan = Offset.zero;
  double brightness = 0; // -0.4 .. 0.4
  double contrast = 1; // 0.6 .. 1.6
  double saturation = 1; // 0 .. 2
  double tilt = 0; // straighten, in degrees (-15 .. 15)

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

/// How far the picture is turned on screen: the quarter turns plus the straighten slider.
double _angle(EditState s) => s.quarter * math.pi / 2 + s.tilt * math.pi / 180;

/// Smallest scale at which the turned and straightened picture covers every corner of the frame.
double _cover(ui.Image i, Size frame, EditState s) {
  final r = _turned(i, s.quarter);
  final a = s.tilt * math.pi / 180;
  final c = math.cos(a).abs(), n = math.sin(a).abs();
  return math.max((frame.width * c + frame.height * n) / r.width, (frame.width * n + frame.height * c) / r.height);
}

/// How far the picture can still slide along its own (straightened) axes before a frame corner would show.
Offset _room(ui.Image i, Size frame, EditState s) {
  final r = _turned(i, s.quarter);
  final k = _cover(i, frame, s) * s.zoom;
  final a = s.tilt * math.pi / 180;
  final c = math.cos(a).abs(), n = math.sin(a).abs();
  return Offset(
    math.max(0, k * r.width / 2 - (frame.width / 2) * c - (frame.height / 2) * n),
    math.max(0, k * r.height / 2 - (frame.width / 2) * n - (frame.height / 2) * c),
  );
}

/// Pan is clamped along the picture's own axes, so the straightened picture always covers all four corners.
Offset _clampPan(ui.Image i, Size frame, EditState s) {
  final a = s.tilt * math.pi / 180;
  final c = math.cos(a), n = math.sin(a);
  final m = _room(i, frame, s);
  final w1 = (s.pan.dx * c + s.pan.dy * n).clamp(-m.dx, m.dx);
  final w2 = (-s.pan.dx * n + s.pan.dy * c).clamp(-m.dy, m.dy);
  return Offset(w1 * c - w2 * n, w1 * n + w2 * c);
}

/// Draws the edited picture into a [frame]-sized area (white behind, in case the picture has see-through parts).
void paintEdit(Canvas canvas, Size frame, ui.Image image, EditState s) {
  canvas.drawRect(Offset.zero & frame, Paint()..color = Colors.white);
  final k = _cover(image, frame, s) * s.zoom;
  canvas.save();
  canvas.clipRect(Offset.zero & frame);
  canvas.translate(frame.width / 2 + s.pan.dx, frame.height / 2 + s.pan.dy);
  canvas.rotate(_angle(s));
  canvas.scale(s.flip ? -k : k, s.flipY ? -k : k);
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

const List<(String, int, int)> _kShapes = [('1:1', 1, 1), ('4:3', 4, 3), ('16:9', 16, 9), ('3:4', 3, 4)];
const List<(String, int)> _kSizes = [('Small', 640), ('Medium', 1000), ('Large', 1600), ('HD', 2400)];
/// Whole degrees show without a decimal, halves with one ("6°", "7.5°").
String _deg(double v) => '${v % 1 == 0 ? v.round() : v.toStringAsFixed(1)}°';
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
  double _quality = 0.85; // JPEG quality, 50 .. 100 %, the same starting point as the website editor
  Size _frame = const Size(300, 300);
  final TextEditingController _wCtrl = TextEditingController(text: '4'); // custom shape, typed as W : H
  final TextEditingController _hCtrl = TextEditingController(text: '3');
  int _shapeW = 4, _shapeH = 3;

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

  @override
  void dispose() {
    _wCtrl.dispose();
    _hCtrl.dispose();
    super.dispose();
  }

  /// The pan is kept inside what the current zoom and angle can cover, so no empty space ever shows.
  void _touch() {
    final image = _image;
    if (image != null) _s.pan = _clampPan(image, _frame, _s);
    setState(() => _tick++);
  }

  void _pickShape(int w, int h) {
    if (w < 1 || h < 1) return;
    _wCtrl.text = '$w';
    _hCtrl.text = '$h';
    setState(() {
      _shapeW = w;
      _shapeH = h;
      _shape = w / h;
      _s.pan = Offset.zero;
      _tick++;
    });
  }

  /// Typing in one box keeps the other box as it is and never moves the caret.
  void _typeShape({int? w, int? h}) {
    final nw = w ?? _shapeW, nh = h ?? _shapeH;
    if (nw < 1 || nh < 1) return;
    setState(() {
      _shapeW = nw;
      _shapeH = nh;
      _shape = nw / nh;
      _s.pan = Offset.zero;
      _tick++;
    });
  }

  double get _frameAspect {
    final t = _turned(_image!, _s.quarter);
    return _shape ?? t.width / t.height;
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
      final jpg = await compute(_encodeJpeg, (data.buffer.asUint8List(), outW, outH, (_quality * 100).round()));
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
      ..flipY = false
      ..zoom = 1
      ..pan = Offset.zero
      ..brightness = 0
      ..contrast = 1
      ..saturation = 1
      ..tilt = 0;
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
        leading: IconButton(tooltip: tr('Close'), icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.of(context).pop()),
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
            _tool(Icons.flip_rounded, 'Mirror', () {
              _s.flip = !_s.flip;
              _touch();
            }),
            _tool(Icons.flip_camera_android_rounded, 'Upside down', () {
              _s.flipY = !_s.flipY;
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
            Wrap(spacing: 8, children: [
              ChoiceChip(label: const Text('Original'), selected: _shape == null, onSelected: (_) => setState(() {
                    _shape = null;
                    _s.pan = Offset.zero;
                    _tick++;
                  })),
              for (final o in _kShapes)
                ChoiceChip(
                  label: Text('${o.$2}:${o.$3}'),
                  selected: _shape != null && (_shape! - o.$2 / o.$3).abs() < 0.001,
                  onSelected: (_) => _pickShape(o.$2, o.$3),
                ),
            ]),
            Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 6, children: [
              const Text('Custom shape', style: TextStyle(color: Colors.white54, fontSize: 12)),
              _shapeField(_wCtrl, 'Shape width', (n) => _typeShape(w: n)),
              const Text(':', style: TextStyle(color: Colors.white54)),
              _shapeField(_hCtrl, 'Shape height', (n) => _typeShape(h: n)),
              const Text('(for example 5 : 2)', style: TextStyle(color: Colors.white38, fontSize: 11)),
            ]),
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
          _slider('Straighten', _s.tilt, -15, 15, (v) => _s.tilt = v, clearLook: false, divisions: 60, shown: _deg(_s.tilt)),
          _slider('Brightness', _s.brightness, -0.4, 0.4, (v) => _s.brightness = v),
          _slider('Contrast', _s.contrast, 0.6, 1.6, (v) => _s.contrast = v),
          _slider('Colour', _s.saturation, 0, 2, (v) => _s.saturation = v),
          _label('Size'),
          Wrap(spacing: 8, runSpacing: 4, children: [
            for (final o in _kSizes) ChoiceChip(label: Text('${o.$1} · ${o.$2}px'), selected: _size == o.$2, onSelected: (_) => setState(() => _size = o.$2)),
            ActionChip(
              avatar: const Icon(Icons.straighten_rounded, size: 16),
              label: Text(_kSizes.any((o) => o.$2 == _size) ? 'Custom px' : 'Custom · $_size px'),
              onPressed: _customSize,
            ),
          ]),
          _label('Quality'),
          Row(children: [
            Expanded(
              child: Slider(value: _quality, min: 0.5, max: 1, divisions: 10, label: '${(_quality * 100).round()}%', onChanged: (v) => setState(() => _quality = v)),
            ),
            SizedBox(width: 46, child: Text('${(_quality * 100).round()}%', textAlign: TextAlign.end, style: const TextStyle(color: Colors.white70, fontSize: 13))),
          ]),
        ]),
      ),
    ]);
  }

  /// Any long side the person wants, from 160 px to 4000 px (the same range as the website editor).
  Future<void> _customSize() async {
    final ctrl = TextEditingController(text: '$_size');
    final picked = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Custom size'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Long side in pixels (max 4000)', suffixText: 'px'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, int.tryParse(ctrl.text.trim())), child: const Text('Use this size')),
        ],
      ),
    );
    ctrl.dispose();
    if (picked != null && mounted) setState(() => _size = picked.clamp(160, 4000));
  }

  Widget _label(String t) => Padding(padding: const EdgeInsets.only(top: 14, bottom: 6), child: Text(t.toUpperCase(), style: const TextStyle(color: Colors.white54, fontSize: 11, letterSpacing: 1.2)));

  Widget _tool(IconData icon, String label, VoidCallback onTap) => InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(8), child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(icon, color: Colors.white), const SizedBox(height: 4), Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11))])),
      );

  Widget _slider(String label, double v, double lo, double hi, void Function(double) set, {bool clearLook = true, int? divisions, String? shown}) => Row(children: [
        SizedBox(width: 84, child: Text(label, style: const TextStyle(color: Colors.white70, fontSize: 13))),
        Expanded(child: Slider(value: v.clamp(lo, hi), min: lo, max: hi, divisions: divisions, onChanged: (x) {
          set(x);
          if (clearLook) _look = '';
          _touch();
        })),
        if (shown != null) SizedBox(width: 46, child: Text(shown, textAlign: TextAlign.end, style: const TextStyle(color: Colors.white70, fontSize: 13))),
      ]);

  Widget _shapeField(TextEditingController c, String label, ValueChanged<int> onSet) => SizedBox(
        width: 62,
        child: Semantics(
          label: label,
          child: TextField(
            controller: c,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(2)],
            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              isDense: true,
              filled: true,
              fillColor: const Color(0xFF0B0F1C),
              contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
              counterText: '',
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white24)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white70)),
            ),
            onChanged: (v) => onSet(int.tryParse(v) ?? 0),
          ),
        ),
      );
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
