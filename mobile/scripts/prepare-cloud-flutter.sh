#!/usr/bin/env bash
set -euo pipefail
SMART_TUTOR_MOBILE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SMART_TUTOR_MOBILE_DIR/scripts/cloud-env.sh"
mkdir -p "$SMART_TUTOR_TOOLCHAINS_DIR" /workspace/.cache/android-downloads "$PUB_CACHE" "$GRADLE_USER_HOME" "$ANDROID_USER_HOME" "$XDG_CONFIG_HOME"

# Pin the Flutter stable version used for this Android project. Existing SDK
# checkouts are preserved; updating them is an explicit flutter upgrade action.
if [ ! -x "$SMART_TUTOR_FLUTTER_BIN" ]; then
  git clone --depth 1 --branch 3.47.7 https://github.com/flutter/flutter.git "$FLUTTER_ROOT"
fi

if [ ! -x "$JAVA_HOME/bin/javac" ]; then
  SMART_TUTOR_JDK_ARCHIVE=/workspace/.cache/android-downloads/jdk21.tar.gz
  SMART_TUTOR_JDK_CHECKSUM=/workspace/.cache/android-downloads/jdk21.sha256
  SMART_TUTOR_JDK_URL='https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12+8/OpenJDK21U-jdk_x64_linux_hotspot_21.0.12_8.tar.gz'
  curl --fail --location "$SMART_TUTOR_JDK_URL" --output "$SMART_TUTOR_JDK_ARCHIVE"
  curl --fail --location "$SMART_TUTOR_JDK_URL.sha256.txt" --output "$SMART_TUTOR_JDK_CHECKSUM"
  SMART_TUTOR_EXPECTED_HASH="$(awk 'NR == 1 {print $1}' "$SMART_TUTOR_JDK_CHECKSUM")"
  printf '%s  %s\n' "$SMART_TUTOR_EXPECTED_HASH" "$SMART_TUTOR_JDK_ARCHIVE" | sha256sum --check
  mkdir -p "$SMART_TUTOR_TOOLCHAINS_DIR/jdk21"
  tar -xzf "$SMART_TUTOR_JDK_ARCHIVE" -C "$SMART_TUTOR_TOOLCHAINS_DIR/jdk21"
fi

SMART_TUTOR_SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [ ! -x "$SMART_TUTOR_SDKMANAGER" ]; then
  SMART_TUTOR_ANDROID_ARCHIVE=/workspace/.cache/android-downloads/commandline-tools.zip
  curl --fail --location https://dl.google.com/android/repository/commandlinetools-linux-16111833_latest.zip --output "$SMART_TUTOR_ANDROID_ARCHIVE"
  printf '%s  %s\n' e025545c62a8e64c7559119566a569fb1dec5f60 "$SMART_TUTOR_ANDROID_ARCHIVE" | sha1sum --check
  SMART_TUTOR_UNPACKED_TOOLS="$(mktemp -d /workspace/.cache/android-downloads/commandline-tools.XXXXXX)"
  unzip -q "$SMART_TUTOR_ANDROID_ARCHIVE" -d "$SMART_TUTOR_UNPACKED_TOOLS"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  mv "$SMART_TUTOR_UNPACKED_TOOLS/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  rmdir "$SMART_TUTOR_UNPACKED_TOOLS"
fi

# Android SDK licences are accepted here as part of the requested Android setup.
printf 'y\n%.0s' {1..100} | "$SMART_TUTOR_SDKMANAGER" --sdk_root="$ANDROID_HOME" --licenses >/dev/null
"$SMART_TUTOR_SDKMANAGER" --sdk_root="$ANDROID_HOME" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;28.2.13676358'

# These commands require storage.googleapis.com in the active network policy.
"$SMART_TUTOR_FLUTTER_BIN" --version
cd "$SMART_TUTOR_MOBILE_DIR"
"$SMART_TUTOR_FLUTTER_BIN" pub get
"$SMART_TUTOR_FLUTTER_BIN" analyze
"$SMART_TUTOR_FLUTTER_BIN" test
"$SMART_TUTOR_FLUTTER_BIN" build apk --debug
