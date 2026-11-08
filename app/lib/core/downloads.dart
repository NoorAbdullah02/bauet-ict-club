import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'package:share_plus/share_plus.dart';

import '../data/api.dart';
import 'utils.dart';

/// Downloads a file the server makes (CSV, PDF, Word, ZIP, backup) and opens the phone's share sheet,
/// so the admin can save it to Files / Drive or send it on.
Future<void> downloadAndShare(BuildContext context, Api api, String path, String filename, {Map<String, dynamic>? query}) async {
  showSnack(context, 'Preparing $filename…');
  try {
    final dir = await getTemporaryDirectory();
    final safe = filename.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
    final file = '${dir.path}${Platform.pathSeparator}$safe';
    await api.downloadTo(path, file, query: query);
    final size = await File(file).length();
    if (size == 0) throw ApiException('The file came back empty');
    await Share.shareXFiles([XFile(file)], subject: filename);
  } on ApiException catch (e) {
    if (context.mounted) showSnack(context, e.message, error: true);
  } catch (e) {
    if (context.mounted) showSnack(context, 'Could not save the file', error: true);
  }
}

/// Downloads a PDF the server makes and opens it in the phone's PDF viewer (for example the certificate preview).
Future<void> previewPdf(BuildContext context, Api api, String path, String filename, {Map<String, dynamic>? query}) async {
  showSnack(context, 'Opening the preview…');
  try {
    final dir = await getTemporaryDirectory();
    final safe = filename.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
    final file = '${dir.path}${Platform.pathSeparator}$safe';
    await api.downloadTo(path, file, query: query);
    if (await File(file).length() == 0) throw ApiException('The file came back empty');
    final r = await OpenFilex.open(file, type: 'application/pdf');
    if (r.type != ResultType.done && context.mounted) {
      // no PDF viewer on the phone: offer the share sheet instead
      await Share.shareXFiles([XFile(file)], subject: filename);
    }
  } on ApiException catch (e) {
    if (context.mounted) showSnack(context, e.message, error: true);
  } catch (e) {
    if (context.mounted) showSnack(context, 'Could not open the preview', error: true);
  }
}

/// A small menu of formats: CSV, PDF, Word, and a ZIP with everything.
class ExportMenu extends StatelessWidget {
  const ExportMenu({super.key, required this.onPick});
  final void Function(String format) onPick;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: 'Download',
      icon: const Icon(Icons.download_rounded),
      onSelected: onPick,
      itemBuilder: (_) => const [
        PopupMenuItem(value: 'csv', child: Text('Spreadsheet (CSV)')),
        PopupMenuItem(value: 'pdf', child: Text('PDF')),
        PopupMenuItem(value: 'docx', child: Text('Word')),
        PopupMenuItem(value: 'zip', child: Text('Everything (ZIP, with pictures)')),
      ],
    );
  }
}
