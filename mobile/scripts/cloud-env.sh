#!/usr/bin/env bash
# Source this file before using the prepared cloud Flutter tools.
export SMART_TUTOR_TOOLCHAINS_DIR="${SMART_TUTOR_TOOLCHAINS_DIR:-/workspace/toolchains}"
export FLUTTER_ROOT="$SMART_TUTOR_TOOLCHAINS_DIR/flutter"
export ANDROID_HOME="$SMART_TUTOR_TOOLCHAINS_DIR/android-sdk"
export JAVA_HOME="$SMART_TUTOR_TOOLCHAINS_DIR/jdk21/jdk-21.0.12+8"
export PUB_CACHE="/workspace/.cache/dart-pub"
export GRADLE_USER_HOME="/workspace/.cache/gradle"
export ANDROID_USER_HOME="/workspace/.android"
export XDG_CONFIG_HOME="/workspace/.config/smart-tutor"
export XDG_CACHE_HOME="/workspace/.cache"
export FLUTTER_SUPPRESS_ANALYTICS=true
export DART_SUPPRESS_ANALYTICS=true
export DASH__SUPPRESS_ANALYTICS=true
export DART_DATA_HOME="/workspace/.cache/dart-data"
export ANALYZER_STATE_LOCATION_OVERRIDE="/workspace/.cache/dart-analysis"
export SMART_TUTOR_FLUTTER_BIN="$FLUTTER_ROOT/bin/flutter"
export SMART_TUTOR_ADB_BIN="$ANDROID_HOME/platform-tools/adb"
