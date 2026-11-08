import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdfx/pdfx.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/theme.dart';
import '../../data/api.dart';

/// Shows a certificate (a PDF made by the server) inside the app, fully visible, with pinch to zoom and a Share button.
class CertificateViewer extends StatefulWidget {
  const CertificateViewer({super.key, required this.title, required this.load});
  final String title;
  final Future<Uint8List> Function() load;

  @override
  State<CertificateViewer> createState() => _CertificateViewerState();
}

class _CertificateViewerState extends State<CertificateViewer> {
  PdfControllerPinch? _controller;
  Uint8List? _bytes;
  String? _error;

  @override
  void initState() {
    super.initState();
    _open();
  }

  Future<void> _open() async {
    try {
      final b = await widget.load();
      if (!mounted) return;
      setState(() {
        _bytes = b;
        _controller = PdfControllerPinch(document: PdfDocument.openData(b));
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not draw the certificate');
    }
  }

  Future<void> _share() async {
    final b = _bytes;
    if (b == null) return;
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}${Platform.pathSeparator}certificate.pdf');
    await file.writeAsBytes(b, flush: true);
    await Share.shareXFiles([XFile(file.path)], subject: widget.title);
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [IconButton(tooltip: 'Share the PDF', onPressed: _bytes == null ? null : _share, icon: const Icon(Icons.ios_share_rounded))],
      ),
      backgroundColor: p.bg,
      body: _error != null
          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
          : _controller == null
              ? const Center(child: CircularProgressIndicator())
              : PdfViewPinch(controller: _controller!, backgroundDecoration: BoxDecoration(color: p.bg)),
    );
  }
}
