# tstamp

One-tap time-stamper for Android, in a dark neon terminal skin.
Log checkpoints along any activity (commute, cooking, study, …), add notes later,
and see how long things really take.

See [SPEC.md](SPEC.md) for the model, rules and roadmap.

## Run on your phone (no emulator, no Android Studio)

Requirements on the PC: Node.js 20+ (LTS). On the phone: **Expo Go** from Play Store
(or the APK from expo.dev). PC and phone on the same Wi-Fi.

```powershell
cd tstamp
npm install
npx expo start
```

Scan the QR code with Expo Go. Code changes reload live on the phone.

- Different networks / Wi-Fi blocks it → `npx expo start --tunnel`
- Clear the bundler cache → `npx expo start -c`
- Quick look in a desktop browser → `npx expo start --web`

> In Iran, Play Store and expo.dev may need a VPN for installing Expo Go and for cloud builds.
> The app itself is fully offline once installed.

## Build a standalone APK (cloud, no Android Studio)

```powershell
npm i -g eas-cli
eas login
eas build:configure          # once; creates eas.json
eas build -p android --profile preview
```

Use a `preview` profile with `"android": { "buildType": "apk" }` in `eas.json`.
EAS returns a link to the `.apk` — open it on the phone and install.

## Using it

| Action | How |
|---|---|
| Start a run of a category | tap its chip under *quick start* (stamps the first checkpoint) |
| Log next checkpoint | tap **[ STAMP ]** |
| Stamp and end the session | long-press **[ STAMP ]** |
| Free stamp (no category) | tap **[ STAMP ]** while idle |
| Undo last stamp | **UNDO** in the toast (5 s) |
| Add note / tags / fix time | tap any stamp row |
| Change a session's category, reopen, delete | history → long-press the session |
| Calendar (gregorian ↔ jalali), accent (green ↔ blue) | conf tab |
| New category / from template | conf → categories |

Sessions left open are closed automatically after the idle time set in *conf*.

## Scripts

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
npm run test:store    # store logic tests in Node (AsyncStorage mocked)
```

## Stack

Expo SDK 58 · React Native 0.88 · TypeScript · zustand + AsyncStorage · jalaali-js · JetBrains Mono
