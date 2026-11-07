#!/usr/bin/env python3
"""Adds the Firebase (Google services) Gradle plugin to the Android project, so phone notifications work.

Used by .github/workflows/checks.yml right after `flutter create` (which writes fresh Gradle files). It only does something when
app/android/app/google-services.json exists (the file downloaded from the Firebase console); without it nothing changes.

Usage: python3 tools/android_firebase.py [path to the android folder, default app/android]
"""
import os
import sys

android = sys.argv[1] if len(sys.argv) > 1 else 'app/android'
VERSION = '4.4.4'
PLUGIN = 'com.google.gms.google-services'

if not os.path.exists(os.path.join(android, 'app', 'google-services.json')):
    print('No google-services.json: phone notifications are not set up in this build.')
    sys.exit(0)

settings = os.path.join(android, 'settings.gradle.kts')
app = os.path.join(android, 'app', 'build.gradle.kts')
if not (os.path.exists(settings) and os.path.exists(app)):
    print('The Gradle files were not found: leaving them as they are.')
    sys.exit(0)

s = open(settings).read()
if PLUGIN not in s:
    marker = 'id("org.jetbrains.kotlin.android")'
    line_start = s.find(marker)
    if line_start < 0:
        print('settings.gradle.kts looks different from what this script expects: leaving it as it is.')
        sys.exit(0)
    line_end = s.index('\n', line_start)
    s = s[:line_end + 1] + f'    id("{PLUGIN}") version "{VERSION}" apply false\n' + s[line_end + 1:]
    open(settings, 'w').write(s)

a = open(app).read()
if PLUGIN not in a:
    marker = 'id("dev.flutter.flutter-gradle-plugin")'
    i = a.find(marker)
    if i < 0:
        print('app/build.gradle.kts looks different from what this script expects: leaving it as it is.')
        sys.exit(0)
    a = a[:i + len(marker)] + f'\n    id("{PLUGIN}")' + a[i + len(marker):]
    open(app, 'w').write(a)
print('Firebase is added to the Android build (phone notifications).')
