# Implemented v0.1 (as built on 14 November 2026)

This is a **living implementation ledger**. The other documents in `docs/` describe the product target; they are not assertions of completion.

## Verified by automated checks

- Pure music theory: major, natural/harmonic/classical melodic minor in all 12 default tonic pitch classes, including correctly spelled G minor, F-sharp major and G-flat major.
- Two-octave turnaround note counts; major/minor triad construction; explicit range failure; seeded repeatability; generated notes within flute default bounds.
- Rhythmic-duration templates and exact 5, 10, 20, 30, 45 and custom session allocations.
- ZIP full backup round trip of metadata plus embedded PDF blob; CRC verification; standard archive compatibility verified using `unzip -t`.

Run `npm test` at project root (Node 20+). The suite currently contains 12 automated tests.

## Included UI features (not yet iPad-verified)

- Static, dependency-free installable PWA with an offline service worker, responsive layout, iPad Home Screen icon, and GitHub Pages deployment action.
- Instrument selection with bundled pastel SVG illustrations, labelled touch-friendly buttons and accessible selected states; matching icons in Settings and piece forms.
- Music library with nested folders and multi-folder piece membership; linked/imported sources.
- One piece journal across folder memberships, guided focus prompts, locally auto-saved draft, playback/recording via browser APIs.
- Flute theory-aware generator with text/staff pitch guide, metronome, generated attempts and manual feedback.
- Simplified piano theory exercises; guided practice for other instruments where actual tuning/inventory is not configured.
- Short practice planner, mode selection, session timer and completed/skipped statuses.
- Full and metadata-only local backup ZIP, with an atomic database replacement on restore.

## Must check on a real iPad before considering it production-ready

1. Safari and installed Home Screen contexts (test whether their local data stores are shared).
2. External private Google Drive link opens under the expected Google account; the PWA must not silently copy it.
3. PDF import from Files, multipage viewing and offline reopening.
4. Microphone permission and codec support, start/stop, playback, discard and milestone persistence.
5. Recording interruptions, audio playback, and metronome during multitasking.
6. Full backup exported to Files and restored to an independent clean context, with real binary PDFs/audio and journals preserved.
7. Touch sizing, VoiceOver and small/split-screen layouts.
8. Repeated deploy/offline service-worker updates preserve local data.

Automated browser navigation was blocked by the authoring environment's Chromium policy (`ERR_BLOCKED_BY_ADMINISTRATOR`) and **was not** performed. Do not claim these integration scenarios are fully tested.

## Remaining product work

- Fully engraved metric notation, phrase rests, slurs, rhythm beams and reliable printable staff parts.
- Richer technical exercises and instrument-specific tuning/inventory editors.
- More robust recommendation engine based on practice history.
- Dedicated PDF annotation, optional cloud sync, and controlled Google Drive authorisation only if genuinely needed.
- Instrument profile creation/archive beyond the five included default kinds.
- Automated end-to-end tests run on an unrestricted desktop-browser environment.
