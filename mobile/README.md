# Smart tutor for Android

This is a Flutter Android app with a native classroom connection screen, saved connection preferences, navigation, loading/error/retry handling, and an embedded Android WebView. It reuses the existing Smart tutor web classroom and API. The learning, homework, scheduling, languages, mood, project, research, doubts, and community screens remain in the shared React implementation; they have not been rewritten as native Flutter widgets.

The app needs a reachable Smart tutor server. A Flutter build does not host the Express/SQLite server on the phone. HTTPS is required in release builds. Debug builds additionally accept HTTP on local/LAN addresses for testing with a connected device. The server's existing selectable demo accounts are still demo accounts.

## Build and install on a connected Android device

Run these commands on **the computer physically connected to your phone**, with Flutter stable, a full JDK 17 or newer, Android SDK, and platform-tools installed. Enable Android developer options and USB debugging, connect the device, and approve the debugging prompt.

```sh
flutter channel stable
flutter upgrade
flutter doctor
flutter doctor --android-licenses
adb devices -l
```

From the Smart tutor repository root, start the existing server in one terminal:

```sh
npm ci
npm run build
npm start
```

In a second terminal, install and open the Android app:

```sh
bash mobile/scripts/install-android.sh
```

The installer requires one authorised device, runs Flutter analysis and tests, builds a debug APK, installs it with `adb install -r` (without resetting app data), and opens Smart tutor. For the default classroom address, it uses `adb reverse` so the Android device can reach the server on the connected computer. Restart the server and re-establish `adb reverse tcp:3001 tcp:3001` after disconnecting/rebooting when necessary. The local server must remain running while students use this connection.

With multiple devices, set `ANDROID_SERIAL` to the desired identifier from `adb devices`. `SMART_TUTOR_FLUTTER_BIN` and `SMART_TUTOR_ADB_BIN` can specify full executable paths.

To use an already deployed classroom instead:

```sh
SMART_TUTOR_CLASSROOM_URL=https://your-classroom.example.com bash mobile/scripts/install-android.sh
```

Replace that example with your actual server address. No classroom has been publicly deployed by this task. The app also lets you enter or change the classroom address after opening it.

## APK and checks

```sh
cd mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

The resulting file is `mobile/build/app/outputs/flutter-apk/app-debug.apk`. This is a development APK, not a signed Play Store release. The existing web app's 3D models, speech voices, and recorded videos depend on Android WebView capabilities; use the app's **Open in browser** action for browser-only features or video downloads.

## Current cloud status

Flutter 3.47.7, Dart 3.13.5, Android SDK 36, and a full Temurin JDK 21 were prepared under `/workspace/toolchains`, with official archive checksums verified. Flutter analysis passes and all three Flutter tests pass. The debug APK build reached Gradle but failed because Java could not resolve `services.gradle.org` in this cloud workspace. No APK has been built or installed yet. The requested next step is installation from a local Codex task; see [local setup](../LOCAL_SETUP.md).

For future cloud development, the saved setup script runs `bash mobile/scripts/prepare-cloud-flutter.sh`. This prepares writable caches and Android SDK packages, accepts the Android SDK licences for this requested setup, resolves Flutter dependencies, runs analysis/tests, and attempts a debug APK build. Java/Gradle network access must work for that final step. To use the prepared tools in a cloud terminal, source `mobile/scripts/cloud-env.sh` and call `"$SMART_TUTOR_FLUTTER_BIN"` or `"$SMART_TUTOR_ADB_BIN"`. Local installation uses the computer's own tools and `mobile/scripts/install-android.sh`.

The current cloud workspace has no USB passthrough or attached Android device. Installing on your own connected device must run on the computer with device access, or an explicitly configured remote ADB connection. This task does not expose an ADB port or create a remote debugging connection.
