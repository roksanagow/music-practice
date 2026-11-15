# Product requirements document (PRD)

**Status:** Draft v1.0. Priorities: **P0 = necessary for a useful MVP**, **P1 = next iteration**, **P2 = optional later**.

## 1. User problem

A returning advanced musician has multiple instruments, a weekly orchestra rehearsal, varying time because of academic deadlines, old favourite pieces, new challenges and personal score files. Unstructured play-throughs are enjoyable but often do not produce intentional improvement. The companion should convert a limited amount of practice time into a realistic, focused session while preserving enjoyment and respecting privacy.

## 2. Goals and exclusions

**Goals:**

- One searchable library spanning five instrument profiles, with as many user-defined folders/subfolders as desired.
- Links to online material (including private Google Drive PDFs) or locally imported PDFs, without publishing private media.
- Instrument-aware, musically sound technical exercises (especially flute scales) generated on demand.
- A practice journal for **each piece** with passage-level goals, optional self-ratings, guided reflections and next-step reminders.
- Record/play back short excerpts, selectively save and compare milestones.
- Create low-pressure sessions of 5, 10, 20, 30, 45 minutes, or custom length, adapting to orchestra priorities.
- Local-first use on an iPad, including during times without internet.

**Non-goals in v1:** AI-based audio assessment; real-time score following; transcription; cloud login; Drive import by OAuth; GitHub write-back; collaboration; copyrighted score distribution; sophisticated PDF editing.

## 3. Primary navigation

**Today** (session generator and resume) · **Library** (folders, search, pieces) · **Technique** (generator, saved drills) · **Journal** (history and recordings) · **Settings** (instrument profiles, privacy, backups).

An instrument switcher is visible on relevant pages. Orchestra is a **folder/tag and session priority**, not a different app or instrument.

## 4. Functional requirements

### Profiles

- **PRO-01 P0** Create, rename, activate, archive or remove instrument profiles. Start with flute, piano, ukulele, ocarina and kalimba; allow multiple profiles per instrument (e.g. two different ocarinas).
- **PRO-02 P0** Save profile display name, clef/notation preference, playable or comfortable register, transposition (where relevant), tuning/layout (where relevant), preferred session length, and enabled exercise types.
- **PRO-03 P0** Defaults are editable; do not assume a universal kalimba tuning or ocarina range. If settings needed for an exercise are missing, guide the user to configure them or offer a generic, safe exercise.
- **PRO-04 P1** Store instrument-specific technique goals and recurring warm-up routines.

### Library, flexible folders, and sources

- **LIB-01 P0** Create, rename, reorder, nest and delete unlimited folders. Default suggestions: Orchestra, Favourites, Learning, Want to Learn, Maintenance, Studies. User-created folders can have any name and can mix instruments or filter to one.
- **LIB-02 P0** A piece may belong to **zero, one, or multiple folders**. One piece ID = one practice journal. Adding a piece to another folder must not duplicate PDFs, recordings or journal history.
- **LIB-03 P0** Create and edit pieces with title, composer/artist, instrument profiles, tags, difficulty (optional), status, goal, and priority. Support pieces with more than one instrument or arrangement.
- **LIB-04 P0** Attach any number of sources to a piece: (a) user-imported local PDF, (b) Google Drive URL, (c) general web score URL, (d) YouTube/reference recording URL. Provide source label and optional notes. Never assume a URL grants public access.
- **LIB-05 P0** Locally imported PDFs display in the app and remain available offline. An external link opens normally in the appropriate viewer and clearly indicates **Requires internet / external permission**. Do not silently mirror private Drive files.
- **LIB-06 P0** Move/delete a folder without implicitly deleting pieces or journal entries. Confirmation must explain whether it removes only membership or also deletes anything; default to preserve pieces.
- **LIB-07 P0** Search/filter by instrument, title, composer, tags, folder, status and recent use; sort by alphabetic, recently practised and user priority.
- **LIB-08 P1** Add passage markers such as `bars 42–48`, timestamp or page number; associate targets and recordings with a marker, without depending on automated PDF score parsing.
- **LIB-09 P2** Link detection and metadata import from external sites; optional dedicated Drive API integration.

### Piece journal / self-assessment

- **JRN-01 P0** Each piece has a journal timeline with dated practice entries, duration (optional), focus category, passage/location, a brief reflection, next action and optional self-rating (1–5 or unscored).
- **JRN-02 P0** Focus categories: tone/timbre, dynamics, rhythm/tempo, articulation, technique, phrasing, expression, confidence; instruments may add categories (piano voicing/pedalling, ukulele chord transitions/strumming, etc.).
- **JRN-03 P0** Display **1 primary focus** plus **up to 1 optional secondary focus** at a time. Prompts are reflective questions, not computed judgements. Let user edit, skip or choose another prompt.
- **JRN-04 P0** At session end ask: `What improved?`, `What still needs work?`, `What exactly should I do next time?`; all are skippable, with short-entry defaults.
- **JRN-05 P0** Save notes automatically while typing and provide visible saved-state feedback. Never lose a draft because the user switched tabs.
- **JRN-06 P1** Surface a pending next-step item from the last entry when the piece is practised again; allow completion/deferral. Track qualitative progress without shame-based streaks.
- **JRN-07 P1** Optional comparison view for milestones and reflection history; no automatic scoring of audio.

### Recording and listening

- **REC-01 P0** Start/stop microphone recording via explicit user interaction and permission. Allow immediate playback before saving.
- **REC-02 P0** Default to **temporary recording**. User chooses `Save milestone` or `Discard`. Attach saved recordings to a piece, journal entry and optional passage. No microphone streaming or upload.
- **REC-03 P0** Audio player supports play/pause, seek, and clear duration/format. Allow recording deletion and warn before deleting a saved milestone.
- **REC-04 P0** Detect supported browser encoding at runtime; show friendly errors if permission, encoding or storage is unavailable; stop media tracks when done.
- **REC-05 P1** Compare two saved recordings in sequence, with labels and same-passage reminder. No automatic audio analysis.

### Technical practice generator

- **TEC-01 P0** Generate musically correct playable exercises from instrument profiles; see [technical practice specification](TECHNICAL_PRACTICE_GENERATOR.md), the authoritative document.
- **TEC-02 P0** Flute exercise families: long tones, controlled dynamics, octave slurs, major scales in all 12 tonic classes, natural/harmonic/melodic minor scales in all 12 tonic classes, chromatic exercises, major/minor arpeggios, articulation and rhythm variations. All generated notes checked against configured range.
- **TEC-03 P0** Set or randomise key, type, octaves, direction, tempo, rhythm, articulation, dynamics and target duration, with **compatibility constraints**; don't offer invalid combinations.
- **TEC-04 P0** Render a legible music-staff representation where the generated exercise has explicit notes/rhythm, plus readable text instructions, tempo and optional metronome. Non-notated tone work may show written instructions/timer instead.
- **TEC-05 P0** Keep a generated exercise's exact configuration and seed stable while it is open or saved; `Regenerate` creates a new exercise with recorded parameters.
- **TEC-06 P0** Track `Completed`, `Skipped`, `Too easy`, `Too hard`, tempo achieved, and optional reflection. Do not penalise skipping.
- **TEC-07 P0** Filtering for unplayable combinations and meaningful error/explanation. Do not merely truncate notes or silently transpose the exercise.
- **TEC-08 P1** Recommend neglected keys, weak articulations and recurring technical goals; show `Why this was suggested` and permit overrides.
- **TEC-09 P1** Piano: scale and arpeggio hands separately, hands together, simple contrary motion within range; other instrument modes use their specific tuning/layout and vetted exercise templates.
- **TEC-10 P2** Higher-level patterns: thirds, sixths, seventh arpeggios, advanced articulation and instrument-specific fingering diagrams.

### Session generation and planning

- **SES-01 P0** Choose instrument, duration (5/10/20/30/45/custom), and priority mode: Balanced / Orchestra soon / Technical / Just for enjoyment / Deadline week.
- **SES-02 P0** A session contains optional warm-up, technical activity, repertoire target(s), listening/reflection and reasonable minute budgets whose sum equals requested duration.
- **SES-03 P0** Default 30-min balanced session: 5 warm-up + 8 technique + 15 repertoire + 2 reflection. Make all blocks editable or skippable.
- **SES-04 P0** Pull repertoire from existing pieces, including orchestral priorities and unfinished next steps; user can pin or replace any item. Unset orchestra repertoire must not break the planner.
- **SES-05 P0** Start/pause/skip/complete controls, with manual duration corrections. Sessions are not dependent on uninterrupted timers or background execution on iPad.
- **SES-06 P1** Prefer variety and neglected skills while respecting recent practice; do not treat missing days as failures.

### Offline, backup and privacy

- **DAT-01 P0** All personal content stored in IndexedDB on the device, not on GitHub Pages; local-only by default.
- **DAT-02 P0** Export/import **versioned backups**, including JSON metadata and an option to include PDF/audio blobs, with clear backup size and import conflict behaviour.
- **DAT-03 P0** After a fresh browser open, offline shell, local PDFs and saved journal data work if installed/cached. External Drive/YouTube pages never promise offline access.
- **DAT-04 P0** Guard failed storage writes and quota pressure; show backup reminders and an indication of estimated usage. Request persistent storage when supported, but don't represent it as guaranteed.
- **DAT-05 P0** No third-party analytics, user accounts, cloud uploads or embedded API tokens required for MVP.
- **DAT-06 P1** Optional encrypted backup archive (only if cryptographic implementation and restore tested). Don't label an unencrypted ZIP as private or encrypted.

## 5. User experience / accessibility

- Tablet-first layout; readable portrait and landscape views; comfortably sized touch targets; light/dark themes.
- Never force a long form to start practising. Provide one-tap `Resume last focus` and `Quick 10-minute practice`.
- Full keyboard navigation and accessible labels; microphone and timer states visible without relying only on colour.
- Show prominently when a source is local/offline versus a link requiring connectivity.
- No surprise deletion, sharing, auto-recording, push alerts or mandatory streaks.
- On open, Today should answer: `What can I practise right now?` and `Where did I leave off?`

## 6. Representative stories

1. **Library:** I add *Hungarian Dance No. 5* to `Flute > Favourites` and `Current Pieces`; I see a single journal whichever folder I open.
2. **Orchestra:** I save a private Drive link to my orchestra part, mark `bars 42–48` as priority, and jump back to that target next week. It opens in Drive only when I'm signed in and online.
3. **Technique:** I request a G harmonic minor scale, two octaves, slur in fours at 80 bpm; the app produces G–A–B♭–C–D–E♭–F♯–G with correct register and rhythm.
4. **Reflection:** I record a 30-second excerpt, replay it, note `crescendo is rushed`, and set `practise bars 12–16 slowly` as next step.
5. **Deadline week:** I choose 10 minutes and get a short, achievable session; skipping something does not destroy a streak.
6. **Multi-instrument:** I switch to a 17-key kalimba profile; the app doesn't assign flute octave slurs or notes missing from my configured tuning.

## 7. Indicators of success

- A first-time user can add an instrument, folder, piece and source, then complete a reflective practice entry without instructions.
- A returning user can get into a relevant exercise or piece in **three interactions or fewer** from Today after setup.
- 100% of test-fixture scale notes, spelling, register and durations are valid.
- A locally imported PDF, journal entry and saved recording survive close/reopen and an offline reload in the installed PWA (subject to browser storage being retained).
- A backup can restore a sample library on a clean browser profile without manual re-entry.
- The user can use the product without granting microphone permission; recording is optional.

## 8. Decisions and open questions (not blockers)

**Decided:** PWA; static GitHub Pages deployment; local-only private data; arbitrary folders; many-to-many piece membership; local PDFs + private external links; no automated audio assessment; five instrument profiles; flute generator first; optional recording; reflections per piece.

**Later decisions:** whether to add a sync provider; if and how to annotate PDFs; precise defaults for individual ocarinas/kalimbas; whether sheet music is viewed in-app or via an external editor for complex annotation; optional UK/ABRSM-inspired technical presets without claiming an official syllabus mapping.
