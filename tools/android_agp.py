#!/usr/bin/env python3
"""Raises the Android Gradle Plugin in the generated Android project to the version
Flutter's own toolchain insists on.

`flutter create` writes settings.gradle.kts from the template of the installed SDK, and a
newer Flutter then refuses to build when that template's plugin number is below what it
expects, for example:

    Your project's Android Gradle Plugin version (Android Gradle Plugin version 9.1.0) is
    lower than Flutter's minimum supported version of Android Gradle Plugin version 9.1.1

Used by .github/workflows/checks.yml right after `flutter create`, so the app build keeps
working whatever stable Flutter the runner picks up.

Usage: python3 tools/android_agp.py [path to the android folder, default app/android]
"""
import os
import re
import sys

# The oldest plugin the Flutter tool accepts. A newer one is left untouched.
MINIMUM = (9, 1, 1)

android = sys.argv[1] if len(sys.argv) > 1 else 'app/android'
settings = os.path.join(android, 'settings.gradle.kts')
if not os.path.exists(settings):
    settings = os.path.join(android, 'settings.gradle')
if not os.path.exists(settings):
    print(f'{android}: no settings.gradle(.kts) found, leaving the Gradle setup as it is.')
    sys.exit(0)

src = open(settings, encoding='utf-8').read()

# Both the Kotlin DSL (id("com.android.application") version "9.1.0" apply false) and the
# Groovy DSL (id 'com.android.application' version '9.1.0' apply false) spell it the same way.
pattern = re.compile(r'(com\.android\.(?:application|library)["\']?\s*\)?\s*version\s*["\'])(\d+)\.(\d+)\.(\d+)')


def bump(match):
    major, minor, patch = (int(match.group(i)) for i in (2, 3, 4))
    if (major, minor, patch) >= MINIMUM:
        return match.group(0)
    wanted = '.'.join(str(n) for n in MINIMUM)
    print(f'Android Gradle Plugin {major}.{minor}.{patch} -> {wanted}')
    return f'{match.group(1)}{wanted}'


updated, count = pattern.subn(bump, src)
if count == 0:
    print('No Android Gradle Plugin version found, leaving the Gradle setup as it is.')
    sys.exit(0)

if updated != src:
    with open(settings, 'w', encoding='utf-8') as f:
        f.write(updated)
else:
    print('Android Gradle Plugin is already new enough.')
