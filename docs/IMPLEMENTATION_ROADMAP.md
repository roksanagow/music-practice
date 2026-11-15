# Implementation roadmap and vibe-coding handoff

The point is to **build a useful app in small, testable slices**, not ask an AI tool to generate the whole product in one attempt. The PRD defines *what*; the technical generator spec defines *musically correct behaviour*; acceptance tests define *done*.

## 1. Build stages

### Milestone 0 — Project skeleton and deployment

- Vite/React/TypeScript, static GitHub Pages deployment, repo-relative base path.
- PWA manifest/service worker with offline shell and an `Install` explanation.
- App layout and navigation; IndexedDB/Dexie schema, migrations and repository patterns.
- Unit-test runner and simple E2E smoke test; establish iPad Safari testing checklist.

**Gate:** build deploys to `https://<owner>.github.io/<repo>/`, opens on iPad, reloads offline after initial installation. Data is local and never committed.

### Milestone 1 — Profiles, folders, repertoire and journals

- Five instrument profile starters with honest capability defaults.
- Unlimited folders/subfolders, many-to-many piece membership, search and tags.
- Piece detail and persistent journal; category-focused prompts; pending next step.
- PDF import from Files, viewing with PDF.js, saved external source links including Drive/YouTube.

**Gate:** add Hungarian Dance No. 5 to two folders, import one PDF, record two reflections; verify it is the same piece and the same journal in both folders. External Drive links open but do not auto-fetch.

### Milestone 2 — Correct flute technical generator (high priority)

- Pure music-theory functions with typed pitch objects, key/scale spelling, octave and range validation.
- Major, natural/harmonic/classical melodic minor in 12 pitch classes, chromatic exercises, major/minor arpeggios.
- Flute long-tone, octave-slur and articulation/rhythm/dynamic templates.
- Notation via VexFlow, text equivalent, safe randomisation/locks/seed, metronome.
- Attempts and manually entered outcomes/tempo.

**Gate:** all core `MUS` acceptance tests pass. A request for G harmonic minor, two octaves, slur in fours, 80 BPM produces correct notes and an explicit, consistent rhythmic/articulation interpretation. Impossible requests are rejected with alternatives.

### Milestone 3 — Practice-session planner

- 5–45 min or custom, balanced/orchestra/technical/enjoyment/deadline modes.
- Pick repertoire and unfinished goals; call technical generator for drill blocks.
- Editable plan, timer controls, skip/resume and practice log.
- Basic non-punitive recommendation (`neglected`, `unfinished goal`, `user priority`).

**Gate:** generate an actionable 30-minute plan with minute totals adding to 30, a technical drill and a specific repertoire next step.

### Milestone 4 — Recording and backup

- Microphone record/playback, temporary-by-default, selected clips saved as milestones.
- PDF/audio blob storage, deletion, usage estimate and error messages.
- Versioned full and metadata-only export/import, restore smoke tests.

**Gate:** record on a real iPad; export a library containing a PDF and a recording; reimport in a clean environment and play/open both. No private content enters GitHub.

### Milestone 5 — Multi-instrument technical depth and polish

- Piano basic scales/arpeggios and additional verified templates.
- Configurable ukulele tuning/chord shapes, ocarina model/inventory, kalimba tine layout and corresponding **validated** practice templates.
- Further reflection prompts and comparison of saved recordings.
- More robust accessibility, offline error handling and performance.

**Gate:** no selected instrument receives a drill it physically cannot play or an instruction meant for another instrument.

## 2. Deferred features — explicitly not in first build

- Automatic timbre, volume, pitch or note correctness grading.
- Drive OAuth picker, Drive file sync, automatic PDF download from private links.
- GitHub API writing of progress or private data (authentication/privacy concerns).
- Apple Pencil PDF ink annotations.
- Multi-device cloud sync and user accounts.
- Full sight-reading generator and AI music recommendations.
- Automatically generated fingerings for all instruments.

## 3. Repository structure (suggestion)

```text
music-practice-companion/
├─ README.md
├─ docs/
│  ├─ PRODUCT_REQUIREMENTS.md
│  ├─ TECHNICAL_PRACTICE_GENERATOR.md
│  ├─ ARCHITECTURE_AND_DATA.md
│  ├─ ACCEPTANCE_TESTS.md
│  └─ IMPLEMENTATION_ROADMAP.md
├─ src/
│  ├─ app/                   # routes, app shell, navigation
│  ├─ domain/                # typed entities and application services
│  ├─ music-theory/          # pure scale/arpeggio/spelling/range functions
│  ├─ exercise-generator/    # constraints, templates, selection and validation
│  ├─ components/            # shared UI incl. notation/audio/PDF viewers
│  ├─ features/              # profiles, library, journals, sessions, settings
│  ├─ storage/               # Dexie, repositories, migration and backups
│  └─ tests/                 # domain / property tests
├─ public/                   # manifest/icons; no private files
├─ .github/workflows/       # deploy and CI
└─ package.json
```

Keep `music-theory` and `exercise-generator` **independent of React**. Their test suite should be runnable without a browser. UI components receive already validated domain objects.

## 4. Implementer rules

1. Read all five documents before coding; treat [technical generator](TECHNICAL_PRACTICE_GENERATOR.md) as normative for music generation.
2. **Build one milestone at a time**; do not prematurely wire a backend, API key or cloud service.
3. Every new `TEC` capability gets a written-pitch fixture and range-validation test before UI exposure.
4. Typed explicit models; no random guessing of scale notes or kalimba/ocarina fingering.
5. Preserve existing records through every schema migration; never use `db.delete()` as an upgrade strategy.
6. Demonstrate mobile/iPad touch behaviour and meaningful loading/error states, not only desktop screenshots.
7. Don't commit private user scores, PDFs, recordings, journal entries or Drive URLs.
8. No unproven claims of automatic audio quality assessment, storage guarantees or Drive offline support.
9. End each milestone with a brief summary: implemented functions, test output, known limitations and manual steps to verify.
10. Keep dependency count modest and pin versions, but do not hand-roll complex PDF or notation parsing.

## 5. First implementation prompt (copy into coding assistant)

> You are implementing a local-first, installable music practice PWA for an iPad. Read the repository's README.md and every file under docs/ before changing code. Implement **Milestone 0 only** from docs/IMPLEMENTATION_ROADMAP.md: React + TypeScript + Vite, a responsive tablet-friendly app shell, IndexedDB/Dexie migrations, GitHub Pages-compatible PWA manifest and offline caching, simple navigation between Today/Library/Technique/Journal/Settings, and automated build/CI checks. Do **not** add a backend, Google OAuth, GitHub API write access, audio-analysis AI or fake music generation. The public repository must contain no private scores or personal data. Include tests for the implemented features and precise instructions for deploying to a repository-subpath GitHub Pages URL. Report any assumptions or platform limitations, and stop after this milestone for review.

### Prompt for Milestone 2 (only after earlier stages pass)

> Implement Milestone 2 using docs/TECHNICAL_PRACTICE_GENERATOR.md as a strict contract. First write pure TypeScript music-theory functions, then run all music fixtures and property tests from docs/ACCEPTANCE_TESTS.md. Distinguish sounding MIDI pitch from spelled written notes, support classical melodic-minor descending rules, and reject unplayable ranges. Only after tests pass, add UI with VexFlow notation and metronome. Do not use a language model to invent scale notes or omit accidental/range validation. Same seed + version + profile must reproduce the same exercise. Show supported and unsupported capabilities honestly.

## 6. Prioritisation principle

When a feature is difficult, cut **scope**, not **correctness**. One reliable flute scale generator with sensible prompts is better than a broad but musically inaccurate generator for five instruments. Similarly, a reliably backed-up private library is better than a sophisticated cloud-sync feature that risks exposing scores.
