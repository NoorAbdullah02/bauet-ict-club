import 'dart:typed_data';

import 'package:bauet_ict_club/widgets/image_editor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;

Uint8List samplePng() {
  final im = img.Image(width: 400, height: 300);
  for (var y = 0; y < 300; y++) {
    for (var x = 0; x < 400; x++) {
      im.setPixelRgba(x, y, x ~/ 2, y ~/ 2, 128, 255);
    }
  }
  return Uint8List.fromList(img.encodePng(im));
}

void main() {
  testWidgets('editor opens a picture, edits it and returns a JPEG', (tester) async {
    Uint8List? result;
    await tester.runAsync(() async {
      await tester.pumpWidget(MaterialApp(
        theme: ThemeData.dark(),
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () async => result = await editImage(context, samplePng(), maxSide: 640),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ));
      await tester.tap(find.text('open'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      for (var i = 0; i < 30 && find.text('Edit picture').evaluate().isEmpty; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 100));
        await tester.pump();
      }
      for (var i = 0; i < 40 && find.text('Turn right').evaluate().isEmpty; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 100));
        await tester.pump();
      }
      expect(tester.takeException(), isNull);
      expect(find.text('Turn right'), findsOneWidget);
      await tester.tap(find.text('Turn right'));
      await tester.pump();
      await tester.dragUntilVisible(find.text('Vivid'), find.byType(ListView).last, const Offset(0, -80));
      await tester.tap(find.text('Vivid'));
      await tester.pump();
      await tester.tap(find.text('Done'));
      for (var i = 0; i < 60 && result == null; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 100));
        await tester.pump();
      }
    });
    expect(tester.takeException(), isNull);
    expect(result, isNotNull);
    final out = img.decodeJpg(result!);
    expect(out, isNotNull);
    expect(out!.height > out.width, isTrue); // a 400x300 picture turned right is portrait; the output keeps that shape
  });
}
