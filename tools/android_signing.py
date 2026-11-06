#!/usr/bin/env python3
"""Signs the release APK with the club's permanent key, so a new APK installs OVER an older one.

Used by .github/workflows/checks.yml right after `flutter create`. Reads the key from environment variables (GitHub secrets):
  ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
Without them nothing is changed and Flutter keeps signing with its temporary debug key (as before).

Usage: python3 tools/android_signing.py [path to the android folder, default app/android]
"""
import base64
import os
import sys

android = sys.argv[1] if len(sys.argv) > 1 else 'app/android'
b64 = os.environ.get('ANDROID_KEYSTORE_BASE64', '').strip()
store_pw = os.environ.get('ANDROID_KEYSTORE_PASSWORD', '')
alias = os.environ.get('ANDROID_KEY_ALIAS', '')
key_pw = os.environ.get('ANDROID_KEY_PASSWORD', '') or store_pw

if not (b64 and store_pw and alias):
    print('No signing key set: the APK will be signed with a temporary key (it cannot update an older install).')
    sys.exit(0)

gradle = os.path.join(android, 'app', 'build.gradle.kts')
if not os.path.exists(gradle):
    print(f'{gradle} not found: leaving the signing as it is.')
    sys.exit(0)

with open(os.path.join(android, 'app', 'upload-keystore.jks'), 'wb') as f:
    f.write(base64.b64decode(b64))
with open(os.path.join(android, 'key.properties'), 'w') as f:
    f.write(f'storePassword={store_pw}\nkeyPassword={key_pw}\nkeyAlias={alias}\nstoreFile=upload-keystore.jks\n')

src = open(gradle).read()
if 'signingConfigs.getByName("release")' in src:
    print('Already patched.')
    sys.exit(0)

props = '''val keystoreProperties = java.util.Properties().apply {
    val f = rootProject.file("key.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

'''
signing = '''    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }

'''
if '\nandroid {' not in src or 'signingConfig = signingConfigs.getByName("debug")' not in src:
    print('The Gradle file looks different from what this script expects: leaving the signing as it is.')
    sys.exit(0)
src = src.replace('\nandroid {', '\n' + props.rstrip('\n') + '\n\nandroid {', 1)
src = src.replace('    buildTypes {', signing + '    buildTypes {', 1)
src = src.replace('signingConfig = signingConfigs.getByName("debug")', 'signingConfig = signingConfigs.getByName("release")', 1)
open(gradle, 'w').write(src)
print('The release APK will be signed with the permanent club key.')
