import 'bn.dart';

/// 'en' or 'bn'. Set by AppState when the person changes the language; the whole app is rebuilt when it changes.
String currentLang = 'en';

bool get isBangla => currentLang == 'bn';

/// tr('English text') gives the Bangla text when Bangla is chosen. A missing translation just shows English.
String tr(String text) => currentLang == 'bn' ? (bnStrings[text] ?? text) : text;
