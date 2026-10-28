# tstamp — spec

Personal Android time-stamper. One tap logs a timestamp; stamps are grouped into sessions
of a category (commute, cooking, study, …) so durations and per-segment times can be averaged.
Single user, offline, data on device. English-only UI, dark terminal aesthetic.

## Goals

- **Fewest taps.** Logging a checkpoint = 1 tap. Starting a templated run = 1 tap.
  No confirmation dialogs on the hot path; undo instead.
- **Any activity**, not only commuting: user-defined categories with optional checkpoint sequences.
- **Averages that mean something**: median + mean per category, later per segment.
- Small, readable codebase that can be finished in a few sessions.

## Domain model (`src/types.ts`)

| Entity | Meaning |
|---|---|
| `Category` | Kind of activity. `checkpoints: string[]` is the optional template; empty = free stamps. |
| `Session` | One run of a category (or uncategorized). Open until closed. Duration = last stamp − first stamp. |
| `Stamp` | `at` (epoch ms, UTC), `label`, `note`. Belongs to one session. |
| `Settings` | `calendar` (gregorian/jalali), `accent` (green/blue), `showTimer` (live elapsed counter on/off), `autoCloseHours`, `shortcuts`. |

Rules:

- At most one active session (`activeSessionId`).
- STAMP with no active session opens a free (uncategorized) session.
- Tapping a category chip starts a new session of that category and stamps its first checkpoint immediately.
  If another session is running, ask once before closing it.
- Label of a new stamp = next checkpoint of the category, else `cpN`.
- Stamping the last checkpoint closes the session automatically. Long-press STAMP = stamp + close.
- Undo (5 s toast) removes the stamp; reopens its session; removes the session if it becomes empty.
- An open session idle longer than `autoCloseHours` is closed at its last stamp (on launch / foreground / next stamp).
- Only *complete* sessions feed stats: closed, ≥2 stamps, and all checkpoints stamped when the category has a template.
- Calendars are display-only. Storage is always epoch ms.
- `showTimer` off hides the big live counter on LOG (shows only the start time) and slows the re-render tick to 30 s.
- Bottom sheets are Modals: they wrap their content in a nested `SafeAreaProvider` (a Modal is its own Android window)
  and keep at least 16 dp above the bottom edge, so actions never sit under the system navigation buttons.

## Architecture

- Expo SDK 57, React Native 0.86, TypeScript, **runs in Expo Go** (no custom native code yet). SDK is pinned to the version the Play Store Expo Go supports — check before upgrading.
- State: `zustand` + `persist` → `AsyncStorage` (key `tstamp/v1`). Pure helpers in `store.ts`.
- Navigation: deliberate hand-rolled 3-tab shell in `App.tsx` (tmux-style status bar). No Expo Router —
  three screens don't justify it.
- Fonts: JetBrains Mono 400/500/700 (subpath imports to keep the bundle small).
  Persian text in notes falls back to the system font.
- Jalali: `jalaali-js`.

```
App.tsx                 shell: prompt line, tab content, status bar, stale-session check
src/types.ts            domain types
src/store.ts            zustand store, actions, pure helpers (stampsOf, nextLabel, categoryStats)
src/templates.ts        built-in templates, seed categories, default shortcuts
src/time.ts             clock / duration / date (gregorian + jalali) / median / mean
src/theme.ts            palette (green|blue accent), alpha(), FONT names
src/ui.tsx              T (text), Btn, Chip, Input, Sheet (keyboard-aware), Cursor, useNow
src/sheets.tsx          StampSheet, SessionSheet, CategorySheet, TemplateSheet
src/screens/LogScreen   active session panel, today summary, quick-start chips, STAMP button, undo toast
src/screens/HistoryScreen   sessions grouped by day, category filter, expand, edit
src/screens/ConfigScreen    calendar, accent, auto-close, categories, shortcuts
```

## UI language

Terminal / Linux: monospace everywhere, `[ bracketed ]` buttons, `# comment` section headers,
prompt line `tstamp@android:~/log $`, blinking block cursor, tmux status bar `[ts] 0:log* 1:hist 2:conf`.
Accent neon green `#3DFF7A` or cyan-blue `#33E1FF` on near-black `#050807`.
Primary action (STAMP) sits in the thumb zone above the status bar.

## Roadmap

- [x] **S1 — core**: data model, stamping, checkpoint flow, undo, stamp editor (label, ±time, shortcuts, note),
      history with filter, session actions (category, reopen, delete), config (calendar, accent,
      auto-close, categories, templates, shortcuts).
- [ ] **S2 — organize**: multi-select stamps in history → move to existing session / new session
      (`moveStamps` already in store). Merge sessions. Rename/reorder checkpoints with drag.
- [ ] **S3 — stats + data**: STATS tab — per category median/mean/min/max, per-segment medians,
      weekday breakdown, last-N trend; JSON export/import (share sheet + file picker), CSV export.
- [ ] **S4 — device**: ongoing notification with STAMP action while a session runs (needs dev build),
      optional home-screen widget, app icon, EAS preview APK.

## Build & release

- `app.json` `expo.version` is the user-visible version; bump it for every APK.
- APK via GitHub Actions (`.github/workflows/android-apk.yml`: prebuild + `assembleRelease`, debug-key signed)
  or EAS (`eas.json` profile `preview` = APK). Keep one route: different routes use different signing keys.

## Testing

- `npx tsc --noEmit` and `npx expo lint` must pass.
- Store logic is plain functions over `useStore.getState()`; it can be exercised in Node by aliasing
  `@react-native-async-storage/async-storage` to an in-memory mock (see README).
