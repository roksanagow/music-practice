# Acceptance and verification tests

Use this checklist as the **definition of done** for implementation. Tests contain expected behaviour, not just UI appearance. Automated tests should cover logic; final PWA behaviour must be manually verified in iPad Safari/Home Screen mode.

## A. Music theory — unit tests (P0)

| ID | Given | When | Then |
|---|---|---|---|
| MUS-01 | G harmonic minor, one octave | Generate ascending | `G A B♭ C D E♭ F♯ G` and semitone pattern `[0,2,3,5,7,8,11,12]` |
| MUS-02 | G classical melodic minor | Generate up-and-down | Ascending uses `E natural, F♯`; descending uses `F natural, E♭` |
| MUS-03 | F♯ major | Generate one octave | Displays `E♯` as seventh degree, not F natural |
| MUS-04 | G♭ major | Generate one octave | Displays `C♭` as fourth degree |
| MUS-05 | E harmonic minor | Generate one octave | Displays `D♯` as raised seventh |
| MUS-06 | Any tonic pitch class 0–11 | Generate all required scale types | Exactly correct interval patterns, first pitch equals last pitch class, correct octave span |
| MUS-07 | One-octave scale | Generate ascending | 8 spelled notes including final tonic |
| MUS-08 | Two-octave scale | Generate ascending | 15 notes including top tonic |
| MUS-09 | Two-octave scale | Generate up-and-down | 29 notes; top tonic appears once at turn |
| MUS-10 | Any scale/arpeggio | Generate with seed and immutable profile snapshot | Identical resolved content for same inputs and generator version |
| MUS-11 | Random scale generation | Generate 1000 variants | No note outside playable range; no invalid selected key/type/pattern combination |
| MUS-12 | Uneven rhythm template | Render 4-note cell | Durations equal exact expected beat total; slurs and rests do not violate measure |
| MUS-13 | Wrong/incomplete instrument config | Request notes not in configured inventory | Generation is blocked, with understandable reason and feasible alternative |
| MUS-14 | G4–G6 allowed flute profile | Request 2-octave G harmonic minor | Exercise generated without omitting any pitch |
| MUS-15 | Standard C4-low flute profile | Request B3-start two-octave scale | Explicitly rejected; no silent octave replacement |
| MUS-16 | Classical melodic minor descending | Render notation | Correct lowered sixth/seventh compared with ascent, valid accidentals |
| MUS-17 | Arpeggio of minor triad | Generate in 12 tonic classes | MIDI offsets match `[0,3,7]`, with valid chord spelling |
| MUS-18 | A 45-minute session | Generate blocks | Integer minute totals sum to exactly 45; same for 5/10/20/30/custom |
| MUS-19 | User locks G minor, 80 BPM, two octaves | Regenerate unlocked properties | Locked properties remain unchanged; no impossibility hidden |
| MUS-20 | A completed historical exercise | Profile range is edited | Historic notes, seed, version and prior reflections remain unchanged |

**Required property-based checks:** for any scale, MIDI note progression follows requested direction; notes are within permitted set; spelling maps to same MIDI semitone; step letters advance diatonically for seven-note scales; durations are positive and add to allowed meters; generation is pure and reproducible.

## B. Folders and library — integration/e2e (P0)

| ID | Scenario | Expected |
|---|---|---|
| LIB-01 | Create `Flute / Favourites`, `Orchestra / This term`, `Challenges` | All visible; folders can nest and rename |
| LIB-02 | Add one piece to Favourites and Challenges | Same piece ID; one journal; one copy of PDF blob |
| LIB-03 | Log reflection from first folder, open from second | Same reflection visible in piece journal |
| LIB-04 | Remove a piece from Favourites | Still exists in Challenges / All pieces with recordings |
| LIB-05 | Delete Challenges folder | Pieces and journals retained in All pieces; no accidental deletion |
| LIB-06 | Try moving a folder inside its own descendant | Action rejected; folder tree remains valid |
| LIB-07 | Add `current orchestra part` as private Drive URL | Link stored privately and opened externally; no automatic sharing / mirroring |
| LIB-08 | Attach a locally imported PDF | PDF opens in app when offline after reopening PWA |
| LIB-09 | View Drive link with network unavailable | UI explains external access requires internet; local attachments remain usable |
| LIB-10 | Search `Brahms` or filter `Favourites` | Correct piece returned without duplicating result |
| LIB-11 | Piece with two instrument profiles | Appears under appropriate profile filters with one journal identity |

## C. Journals, reflections and recording (P0)

| ID | Scenario | Expected |
|---|---|---|
| JRN-01 | Start a `Dynamics` focus for Hungarian Dance | Show 1 primary reflection category, relevant questions, optional secondary |
| JRN-02 | Save `crescendo starts too suddenly`, next `bars 12–16 slow` | Both visible in timeline and suggested when re-opening piece |
| JRN-03 | Leave a partially typed reflection and reopen | Saved draft restored, or explicit unsaved state/warning if a platform error occurred |
| JRN-04 | Skip rating or skip recording | Journal entry can still be completed |
| JRN-05 | Record 30 seconds, replay, Discard | Playback works, recording not retained in persistent blob store |
| JRN-06 | Record 30 seconds, `Save milestone` | Recording linked to correct piece/entry and survives close/reopen |
| JRN-07 | Deny microphone permission | Clear error; rest of app usable without recording |
| JRN-08 | Start/stop recording multiple times | Tracks released; no unintended ongoing recording |
| JRN-09 | Save two milestone clips to one passage | Both labelled, playable, deletable individually |
| JRN-10 | Log an unscored attempt | App does not calculate a fictitious ability score |

## D. Sessions and progress (P0)

| ID | Scenario | Expected |
|---|---|---|
| SES-01 | Generate `Balanced`, 30 minutes | 5 + 8 + 15 + 2-minute allocation by default |
| SES-02 | Choose `Orchestra soon` with a prioritised orchestra piece | Orchestra item appears with its pending passage target |
| SES-03 | Choose Orchestra soon with no orchestra pieces | App still generates a sensible session; explains no orchestra piece selected |
| SES-04 | Choose `Deadline week`, 10 minutes | Short, finishable plan without streak penalty |
| SES-05 | Skip technical exercise | Session continues; skip recorded neutrally |
| SES-06 | Log `too hard at 84 BPM` | Follow-up recommendation may suggest a slower variant with explicit explanation |
| SES-07 | Edit plan minutes | Total rebalances or prompts about mismatch; never silently changes requested total |

## E. Storage, backup and PWA (P0)

| ID | Scenario | Expected |
|---|---|---|
| DAT-01 | Reload page after entering data | Profiles, folders, pieces and journals persist |
| DAT-02 | Install/open Home Screen PWA after first online load, then go offline | App shell, local PDFs, exercise templates and saved journals remain usable |
| DAT-03 | Full export to Files with PDF and recording | Contains manifest, records and both blobs; no broken file references |
| DAT-04 | Import full backup to clean profile | All pieces, folder membership, journal entries, exercises and blobs restored |
| DAT-05 | Export metadata-only backup | UI warns that PDF/audio binaries are excluded; restore preserves metadata but marks missing blobs |
| DAT-06 | Simulated quota exceeded | Friendly error, no false `saved` indication; user can export/delete blobs |
| DAT-07 | Import backup with unknown future format | Warn/reject safely; original library unchanged |
| DAT-08 | Update app release with IndexedDB migration | Old library remains readable; no schema wipe |
| DAT-09 | Examine public GitHub branch and built Pages assets | No personal Drive URLs, private PDFs, recordings or journal data |
| DAT-10 | Open PWA at `/repository-name/` path | Service worker, links, icons and assets resolve correctly |
| DAT-11 | Open same app on a different device without importing backup | Clearly communicates that data is device-local and not automatically synced |

## F. Hands-on iPad checks (required before declaring MVP complete)

1. iPad Safari portrait and landscape layout, including split-view where possible.
2. Home Screen installation, relaunch, and offline reload after initial caching.
3. PDF picker from Files; display and scroll a multipage PDF; close/reopen.
4. Private Google Drive URL opened while signed into correct account; confirm link isn't embedded improperly; verify offline warning.
5. User-initiated microphone permission, record/replay/save/discard using actual available iPad codec.
6. Navigate away mid-recording; make sure capture stops and no clip is silently saved.
7. Audio playback with headphones and app interruption (e.g. Control Center / switch away).
8. Export ZIP to Files, then import on a clean browser context; check data counts and actual PDF/audio playback.
9. Font scale, touch targets, VoiceOver labels and contrast.
10. Network reconnect and new deployed version must not clear local database.

## G. Completion gate

- **Do not ship a randomly generated scale feature without MUS-01 to MUS-20 passing.**
- **Do not call a PWA `offline-ready` until DAT-02 and the iPad hands-on check pass.**
- **Do not call private URLs `securely synced` when they are only device-local bookmarks.**
- **Do not call backups `complete` until an exported archive has been successfully restored in a clean environment.**
