# Cadence — Music Practice Companion

A local-first, installable **Progressive Web App** for deliberate musical practice across flute, piano, ukulele, ocarina and kalimba. Designed for an iPad and GitHub Pages.

**Status:** Working first implementation (`0.1.0`). This is not yet an iPad-verified production release. See the current capability matrix below and the original full requirements in `docs/`.

## What is implemented

- Responsive tablet-friendly navigation: **Today**, **Library**, **Technique**, **Journal**, **Settings**.
- Five separate instrument profiles with pastel illustrated selection buttons, each with editable range and its own repertoire filter.
- Local **IndexedDB** storage with named, nested folders and multi-folder membership. A piece has one journal regardless of how many folders contain it.
- Piece title/composer, optional tags, goal, status and priority; PDFs from Files, plus Google Drive/YouTube/other links. Local PDFs are stored on the device and displayed using a browser PDF viewer.
- Piece journals with guided focus prompts, optional score and passage, improvements, concerns, next action, date and duration. Entries persist; in-progress journal drafts auto-save.
- Audio recording via `getUserMedia` + `MediaRecorder`, preview/discard by default, and selected milestone audio stored locally with playback and delete.
- Flute scale generator with proper key spelling for **12 tonic classes** in major, natural minor, harmonic minor, classical melodic minor; chromatic studies, major/minor arpeggios, gentle long tones and octave slurs. Explicit range checks, rhythm/articulation/dynamics presets, seed, exact notes and a written pitch-staff **guide**, plus a metronome.
- Simplified piano scale/arpeggio generator. Guided listening/control exercises (without unverified fingering or pitch claims) for the other instruments.
- Practice plans for 5, 10, 20, 30, 45 minutes, with orchestra/technical/enjoyment/deadline modes, timer, skip/done and focused repertoire suggestions. Current plan persists on reload.
- Exercise attempt tracking (outcome, tempo, reflections). Journals are manually assessed; **no automatic audio analysis**.
- Full portable **ZIP backup** (journal/library metadata + local PDFs/audio) and metadata-only ZIP; checked restore replaces data in a single IndexedDB transaction after explicit confirmation.
- GitHub Pages Actions deployment and an offline service worker, with relative URLs suitable for a repository subpath.

## Deliberate first-release limitations

- This implementation uses **plain JavaScript ES modules and CSS**, not the React/TypeScript/Dexie stack in the original proposal. The build environment did not provide a package registry; the current source is a no-install alternative that can be tested and deployed directly. Migrate later only if useful.
- The small SVG staff is a **pitch guide** only, not full rhythmic engraving. Written rhythm instructions and exact pitched notes are shown. High-quality staff notation with slurs, beaming and rests is still pending.
- Drive URLs are external bookmarks, **not synced or downloaded** by the app. External files are not accessible offline unless separately imported as local PDFs.
- No Apple Pencil PDF annotation, Google Drive login, GitHub repository writeback, cloud sync, automatic music assessment, or cross-device sync.
- A full backup is uncompressed (to avoid third-party code). Large recordings/PDFs will make large backup files. Test Files export/restore on your iPad before relying on it.
- iPad Safari / Home Screen microphone recording, PDF display and background audio interruptions still require **real-device testing**. Browser stores may be different between Safari and Home Screen installation. Export a backup before switching contexts.
- MIDI note-range editing is currently numeric; future versions should add friendly note selectors and per-instrument tuning inventory editors. Ocarina/kalimba exercises are intentionally guided until their real note layouts are known.
- UI/browser end-to-end automation could not run in the authoring environment because the browser is blocked by administrative navigation policy. The pure logic/unit suite runs.

## Run on a laptop

No install or bundling required. Python 3 or any static web server works:

```bash
cd music-practice-companion
python3 -m http.server 4173
```

Open **http://localhost:4173/** in a modern browser. Do not double-click `index.html` using `file://` because browser module loading and offline APIs depend on HTTP(S).

Run tests using Node 20+:

```bash
npm test
```

There are **no npm dependencies** and no `npm install` is necessary.

## Deploy to GitHub Pages

1. Create a new repository, such as `music-practice-companion`.
2. Unzip this package and commit its **contents at the repository root** on the `main` branch (`index.html` must be at root).
3. On GitHub, go to **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
4. The included `.github/workflows/pages.yml` runs the tests and deploys the static site on pushes to `main`.
5. Open the resulting `https://YOURUSERNAME.github.io/music-practice-companion/` address in Safari on your iPad, tap **Share → Add to Home Screen**.
6. Before depending on offline use, open the Home Screen app once while online, then verify that it can reopen with connectivity off. Test importing a PDF, microphone recording, and full backup/restore on your real iPad.

**Do not put personal PDFs, private Google Drive links, practice notes or recordings in the GitHub repository.** The app's public code is generic; all entered personal data remains in the browser's IndexedDB store until you export it.

## Backup policy

- Use **Settings → Download full backup (ZIP)** to preserve audio and PDFs, then save to Files / iCloud Drive or another private storage location.
- **Metadata only** exports the journals, pieces and sources but marks local audio/PDF files missing on restore.
- **Restore from a backup ZIP** completely replaces existing local data after a confirmation. If quota is exceeded, IndexedDB aborts the replacement transaction; it should leave the previous database intact.
- Neither browser storage nor an installed Home Screen app automatically syncs to GitHub or another device. Treat exports as essential.

## Specification documents

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Technical exercise generator](docs/TECHNICAL_PRACTICE_GENERATOR.md)
- [Architecture and data](docs/ARCHITECTURE_AND_DATA.md)
- [Acceptance tests](docs/ACCEPTANCE_TESTS.md)
- [Implementation roadmap](docs/IMPLEMENTATION_ROADMAP.md)

The `docs/` files describe the full **target product**, including features deliberately deferred beyond this first implementation. They are not claims that every acceptance test currently passes.

## Suggested next steps with Codex

1. Commit this project to your GitHub repository and use Codex on the laptop to review/extend it.
2. Run `npm test`, then test all five screens in your laptop browser.
3. Add proper staff engraving and refine technical exercise options **without** weakening music theory tests.
4. Test actual iPad microphone, PDF and backup behaviour; document results.
5. Add instrument-specific tuning/inventory editors, more validated exercise families, and gradual practice recommendations.

When giving this repository to Codex, ask it to read the README and `docs/` before changes, run tests, and ship one feature at a time.
