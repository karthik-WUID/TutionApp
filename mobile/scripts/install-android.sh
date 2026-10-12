#!/usr/bin/env bash
set -euo pipefail

SMART_TUTOR_MOBILE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SMART_TUTOR_FLUTTER="${SMART_TUTOR_FLUTTER_BIN:-flutter}"
SMART_TUTOR_ADB="${SMART_TUTOR_ADB_BIN:-adb}"
SMART_TUTOR_CLASSROOM="${SMART_TUTOR_CLASSROOM_URL:-http://127.0.0.1:3001}"

command -v "$SMART_TUTOR_FLUTTER" >/dev/null || { echo 'Flutter is required on the computer connected to your Android device.' >&2; exit 1; }
command -v "$SMART_TUTOR_ADB" >/dev/null || { echo 'Android platform-tools (adb) are required.' >&2; exit 1; }

SMART_TUTOR_DEVICES="$("$SMART_TUTOR_ADB" devices)"
SMART_TUTOR_SERIAL="${ANDROID_SERIAL:-}"
if [ -z "$SMART_TUTOR_SERIAL" ]; then
  SMART_TUTOR_READY_DEVICES="$(printf '%s\n' "$SMART_TUTOR_DEVICES" | awk '$2 == "device" {print $1}')"
  SMART_TUTOR_DEVICE_COUNT="$(printf '%s\n' "$SMART_TUTOR_READY_DEVICES" | awk 'NF {n++} END {print n+0}')"
  if [ "$SMART_TUTOR_DEVICE_COUNT" -ne 1 ]; then
    printf '%s\n' "$SMART_TUTOR_DEVICES"
    echo 'Connect one Android device, enable USB debugging, and approve its debugging prompt. If several devices are connected, set ANDROID_SERIAL.' >&2
    exit 1
  fi
  SMART_TUTOR_SERIAL="$SMART_TUTOR_READY_DEVICES"
fi
"$SMART_TUTOR_ADB" -s "$SMART_TUTOR_SERIAL" get-state >/dev/null

# Build only the connected device's architecture to reduce disk use and APK size.
SMART_TUTOR_ABI="$("$SMART_TUTOR_ADB" -s "$SMART_TUTOR_SERIAL" shell getprop ro.product.cpu.abi | tr -d '\r')"
case "$SMART_TUTOR_ABI" in
  arm64-v8a) SMART_TUTOR_TARGET='android-arm64' ;;
  armeabi-v7a) SMART_TUTOR_TARGET='android-arm' ;;
  x86_64) SMART_TUTOR_TARGET='android-x64' ;;
  *) echo "Unsupported Android device architecture: $SMART_TUTOR_ABI" >&2; exit 1 ;;
esac

if [ "$SMART_TUTOR_CLASSROOM" = 'http://127.0.0.1:3001' ]; then
  curl --fail --silent http://127.0.0.1:3001/api/health >/dev/null || { echo 'First start Smart tutor on this computer: npm run build, then npm start from the project root.' >&2; exit 1; }
  "$SMART_TUTOR_ADB" -s "$SMART_TUTOR_SERIAL" reverse tcp:3001 tcp:3001
fi

cd "$SMART_TUTOR_MOBILE_DIR"
"$SMART_TUTOR_FLUTTER" pub get
"$SMART_TUTOR_FLUTTER" analyze
"$SMART_TUTOR_FLUTTER" test
"$SMART_TUTOR_FLUTTER" build apk --debug "--target-platform=$SMART_TUTOR_TARGET" "--dart-define=CLASSROOM_URL=$SMART_TUTOR_CLASSROOM"
"$SMART_TUTOR_ADB" -s "$SMART_TUTOR_SERIAL" install -r build/app/outputs/flutter-apk/app-debug.apk
"$SMART_TUTOR_ADB" -s "$SMART_TUTOR_SERIAL" shell am start -n com.smarttutor.smart_tutor_android/.MainActivity
