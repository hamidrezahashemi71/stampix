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

> The project targets **Expo SDK 57**. Expo Go runs exactly one SDK; if it says
> *"Project is incompatible with this version of Expo Go"*, check the SDK shown in Expo Go
> (settings / home) and align the project: `npm i expo@~<sdk>.0.0 && npx expo install --fix`.

- Different networks / Wi-Fi blocks it → `npx expo start --tunnel`
- Clear the bundler cache → `npx expo start -c`
- Quick look in a desktop browser → `npx expo start --web`

> In Iran, Play Store and expo.dev may need a VPN for installing Expo Go and for cloud builds.
> The app itself is fully offline once installed.

## Build a standalone APK

### Option A — GitHub Actions (no Expo account, no Android Studio)

The workflow `.github/workflows/android-apk.yml` runs `expo prebuild` + Gradle on GitHub's runners
and produces a release APK (signed with the debug key — fine for personal sideloading).

```bash
# once: create an empty private repo on github.com, then
git remote add origin https://github.com/<you>/tstamp.git
git push -u origin main
```

GitHub → repo → **Actions** → **android-apk** → **Run workflow**. After ~10 min open the run and
download the **tstamp-apk** artifact (a zip containing `tstamp-v<version>.apk`).
Pushing a tag (`git tag v0.1.2 && git push --tags`) also triggers a build.

### Option B — EAS cloud build (needs a free Expo account; VPN may be needed in Iran)

```powershell
npm i -g eas-cli
eas login
eas build -p android --profile preview
```

`eas.json` already defines `preview` as an APK. EAS prints a link to the `.apk`.

### Installing on the phone

Open the `.apk` on the phone → allow "install unknown apps" for the browser/file manager → install.
Data lives in the app's storage: uninstalling the app deletes it (export arrives in roadmap S3).
Later builds install over the previous one and keep data, as long as they come from the same route
(A and B use different signing keys — switching routes requires uninstalling first).

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

Expo SDK 57 · React Native 0.86 · TypeScript · zustand + AsyncStorage · jalaali-js · JetBrains Mono
