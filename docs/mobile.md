# Mobile app

The app lives in `apps/mobile`. It is an Expo / React Native app written in TypeScript and
uses the typed client from `packages/api-client`.

Requirements: Node 22, pnpm (the version is pinned in the root `package.json`; `corepack
enable` picks it up), and an API to talk to (see [Self-hosting](self-hosting.md)).

## Run it with Expo

```bash
pnpm install
pnpm --filter @isitfishy/mobile start
```

Scan the QR code with Expo Go on your phone. In development the app calls the API on the
machine running Expo, port 3000, so a phone on the same Wi-Fi works without setup. To use
another API, set `EXPO_PUBLIC_API_URL`:

```bash
EXPO_PUBLIC_API_URL=https://api.example.org pnpm --filter @isitfishy/mobile start
```

Sharing text to the app from another app needs a development or store build; Expo Go does
not register the share target.

## Tests

```bash
cd apps/mobile
pnpm typecheck
pnpm test
```

The unit tests use `jest-expo` and run without a device.

## Build for Android

A local release build needs Java 17 and the Android SDK:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=https://api.example.org pnpm exec expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The APK ends up in `android/app/build/outputs/apk/release/`. `EXPO_PUBLIC_API_URL` is read
at build time, so set it to the API the build should use.

Release builds only talk HTTPS. For a build that must reach a local API over plain HTTP,
as in the end-to-end tests, set `E2E=1` when running `expo prebuild`; never ship such a
build.

## End-to-end tests with Maestro

The flows in `apps/mobile/.maestro` drive the real app on an Android emulator with
[Maestro](https://maestro.mobile.dev/): they type a message, press check and assert the
result screen. CI (`.github/workflows/mobile-e2e.yml`) runs them like this:

1. start a scorer on port 8000 and the API on port 3000;
2. build a release APK with `E2E=1` and `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`
   (the emulator reaches the host's localhost through `10.0.2.2`);
3. boot an API 34 x86_64 emulator, install the APK and run
   `maestro test apps/mobile/.maestro`.

To run them on your own machine, do the same with an emulator you already have:

```bash
adb install isitfishy.apk
maestro test apps/mobile/.maestro
```

The flows assert specific results for their inputs, so they need a scorer that returns
those results. Write flows of your own that match your scorer when you plug in a different
one.
