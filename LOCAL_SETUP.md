# Continue Smart tutor locally

This app was created in `/workspace/TutionApp` in a cloud task, then extracted on your Mac into `/Users/utvyakta.com/Documents/TutionApp/Smart-tutor`. Local execution can access the project and your connected Android device.

## Run again on this Mac

The Mac-specific tool paths are saved in the ignored `.local/env.sh` file. From the extracted project:

```sh
bash scripts/start-local.sh
```

Keep that terminal running. In a second terminal, reconnect your phone with USB debugging authorized, then run:

```sh
source .local/env.sh
bash mobile/scripts/install-android.sh
```

Open the desktop classroom at `http://localhost:3001`. The phone uses ADB reverse to reach the same server while connected by USB. After reconnecting USB, restore the connection with `source .local/env.sh` followed by `adb reverse tcp:3001 tcp:3001`.

If source files change, run `source .local/env.sh`, `npm run build`, and restart the server. The original ZIP remains on your Desktop.

## Local installation completed — 10 October 2026

- Flutter updated to stable 3.47.7; Node.js 24.21.0 installed under `~/development/node`.
- Classroom production build and all 25 API tests passed.
- Flutter analysis and all three Flutter tests passed.
- Debug APK built and installed successfully on the Samsung SM-A076B; Android confirmed the app launch, and the classroom screen was visually verified on the unlocked phone.
- APK: `mobile/build/app/outputs/flutter-apk/app-debug.apk`.
- Fixed the debug manifest's local HTTP override. The installer builds for the connected device's processor. Gradle uses a 2 GB heap and two workers to fit this Mac's 8 GB RAM.

The phone must be unlocked to view the app. Keep the classroom server running and the USB connection active for this local setup.

## Move the app

The prepared `Smart-tutor-local.zip` contains the React classroom, Express server, Flutter Android companion, dependency lockfiles, Gradle wrapper, and a consistent SQLite backup of the current classroom at `.data/smart-tutor.sqlite`. It omits machine-specific SDK paths, tools, caches, Git metadata, and credentials. Treat the archive as private because it includes saved classroom activity.

Copy the archive from this cloud task to your Mac, then extract it into a **new folder**. Its top-level folder is `Smart-tutor`. Preserve any existing files in your local `TutionApp` project; inspect and merge them separately instead of overwriting them. The generated app files have not been pushed to GitHub, so cloning the repository alone will not retrieve this work.

In Codex, open the extracted project and start a task using **local execution**. The archive includes this guide and the Android installer.

## Install on Android

Connect your Android phone or tablet to the Mac, enable developer options and USB debugging, and approve the phone's debugging prompt. The Mac needs Node.js 24 or newer, current stable Flutter, a full JDK, and Android SDK/platform-tools. If Flutter is already installed, update and check it:

```sh
flutter channel stable
flutter upgrade
flutter doctor
flutter doctor --android-licenses
adb devices -l
```

From the extracted project, start the classroom in one terminal:

```sh
npm ci
npm run build
npm start
```

In a second terminal in the same folder:

```sh
bash mobile/scripts/install-android.sh
```

The installer analyses and tests Flutter, builds a debug APK, installs it on one authorised Android device, opens Smart tutor, and connects it to the local classroom using ADB reverse. The Mac's classroom server must remain running. With multiple devices, set `ANDROID_SERIAL` to the intended device identifier.

## Prompt for the local Codex task

> Continue Smart tutor from this extracted project. Preserve existing source and classroom data. Update Flutter to the current stable version and prepare the local Android toolchain. Run the classroom server, then run `bash mobile/scripts/install-android.sh` to build, install, and launch it on my connected Android phone/tablet. Check the device and actual app launch before reporting installation success. The cloud task passed Flutter analysis, three Flutter tests, and 25 API tests; it did not build an APK or install on a device.

## Activate Oxford dictionary lookup

Open `.env.local` in the extracted project and fill `OXFORD_APP_ID` and `OXFORD_APP_KEY` using your Oxford Dictionaries API account. Use `OXFORD_API_MODE=production` for your subscribed Words and Thesaurus endpoints; use `sandbox` only for the restricted trial (words starting with “a”). Keep this file private. Restart the classroom server after editing it, then open **Topic dictionary** and look up a word. Related Wikimedia pictures already work without credentials. Oxford content has not yet been tested live because no credentials were supplied.
