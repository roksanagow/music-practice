# Technical practice generator — detailed specification

**This is the authoritative spec for technical practice.** Implement it as a **deterministic, testable music engine**, not an unconstrained random prompt generator. If a requested combination cannot be rendered or played, explain why and offer an explicit alternative. Do not invent a notation/fingering answer.

## 1. Purpose and boundaries

The generator helps the user improve *skills*, not merely complete random scales. Each generated task must have:

1. **Intention** — e.g. even semiquavers, legato across a register change, stable dynamics.
2. **Musical content** — correctly constructed notes or a safe text-only technical drill.
3. **Performance instructions** — tempo, articulation, rhythm, dynamics, register, number of repeats and an estimated duration.
4. **One reflection prompt** — e.g. `Which fingering transition was least even?`
5. **Loggable outcome** — completed/skipped, achieved tempo and a short note.

The system must not assert that the user sounded good or made a mistake unless the user records that assessment. **Audio feedback is explicitly out of scope.**

## 2. Instrument-capability model

Each instrument profile supplies the capabilities the generator needs. This avoids a single generic `play all scales` engine trying to produce impossible work.

| Field | Example for flute | Purpose |
|---|---|---|
| `instrumentKind` | `flute` | Select generator plug-in |
| `writtenRange` | MIDI 60–96 (C4–C7) configurable | Hard notation/playability envelope |
| `comfortRange` | MIDI 62–93 (D4–A6) configurable | Default safe envelope; narrower than maximum |
| `transpositionSemitones` | `0` | Written vs sounding pitch |
| `clef` | `treble` | Notation |
| `pitchInventory` | Chromatic within configured range | Set of physically available notes, if constrained |
| `supportedArticulations` | single-tongue, slur 2, slur 4, etc. | Selection constraints |
| `supportedModes` | scales, arpeggios, long tones, slurs | Available drills |
| `tuningOrLayout` | Not needed for concert flute | Required for kalimba/ukulele/ocarina |
| `difficultyPreferences` | current comfortable tempo, register | Personalisation |

**Flute defaults are suggestions, not truth for all players:** standard C-foot concert flute typically starts C4; optional B-foot reaches B3. Configured comfortable and maximum ranges must be editable. Avoid assigning prolonged high notes as a default warm-up; prefer middle-range notes and advance gradually. Range must be defined per **written pitch** and checked again after transposition if relevant.

Other instruments:

- **Piano:** A0–C8 keyboard range; exercise types specify right/left/both hands, parallel/contrary motion and hand span. Don't derive fingerings automatically in MVP; use vetted preset fingerings or omit them.
- **Ukulele:** configurable tuning (e.g. high-G G4–C4–E4–A4, low-G alternative), string/fret count and supported shapes. Vetted chord-transition/strumming drills in MVP; don't generate unverified chord shapes.
- **Ocarina:** require particular model/tuning, actual playable pitch inventory, and optionally a vetted fingering chart before generating scale notation. Different 12-hole, 10-hole, pendant or transverse instruments are not interchangeable.
- **Kalimba:** require actual set of tuned tines and layout, not just `17-key` as a complete capability description. Offer melodies/patterns only from available tones. Do not generate chromatic notes if missing.

All five profiles can use repertoire, plans and journals in MVP. **Full combinatorial scale generation is a P0 deliverable for flute first.** Piano basic scales/arpeggios and vetted drills for other instruments follow in later milestones, with a visible `not yet supported` state rather than counterfeit content.

## 3. Musical pitch and spelling rules

### 3.1 Internal pitch representation

Use **two distinct concepts**:

- **Sounding pitch:** integer MIDI note or semitone index, suitable for range checks and comparison.
- **Written pitch:** `letter` (A–G), `accidental` (integer alteration, e.g. -1 = ♭, +1 = ♯), and `octave` (scientific pitch notation), suitable for notation.

Never use a flat/sharp display string as the sole internal pitch representation. Notes that are enharmonic on a piano (e.g. F♯ and G♭) may have different *notation* roles.

### 3.2 Required scale patterns

Intervals below are semitones measured from tonic **within one octave**; the terminal octave tonic is appended by the generator.

| Scale type | Semitone pattern | Direction semantics |
|---|---|---|
| Major | `[0,2,4,5,7,9,11]` | Same ascending/descending |
| Natural minor | `[0,2,3,5,7,8,10]` | Same ascending/descending |
| Harmonic minor | `[0,2,3,5,7,8,11]` | Same ascending/descending |
| Melodic minor (classical) | Ascend `[0,2,3,5,7,9,11]` | Descend **natural minor** `[0,2,3,5,7,8,10]` |
| Chromatic | Every semitone | Choose sensible directional accidentals; not just a diatonic scale |
| Major pentatonic (P1) | `[0,2,4,7,9]` | Same up/down |
| Minor pentatonic (P1) | `[0,3,5,7,10]` | Same up/down |
| Whole tone (P2) | `[0,2,4,6,8,10]` | Same up/down |

**All keys** means all **12 pitch classes** for each supported scale type, with appropriate enharmonic *written spellings*. The UI should allow enharmonic choices when sensible, while defaulting to conventional, readable spellings.

**Notation algorithm (for diatonic heptatonic scales):**

1. Choose a spelled tonic, e.g. `G4`, `F#4`, `Bb4`.
2. For degrees 1–7, advance through successive **letter names** from that tonic.
3. Calculate target semitone via selected interval pattern, compare with the letter's natural pitch, and derive necessary accidental.
4. Add octave shift when advancing past C; verify displayed notes match the calculated semitone and letter order.
5. For descending **classical melodic minor**, use the *natural-minor* alterations of degrees 7 and 6, not reverse the ascending altered notes unchanged.
6. Respect key signature and show accidentals accurately; allow `♯`, `♭`, natural and, if needed, doubles or reject uncommon spelling with a readable enharmonic alternative.

**Examples that must pass:**

- **G harmonic minor:** G – A – B♭ – C – D – E♭ – F♯ – G (not F natural).
- **G classical melodic minor ascending:** G – A – B♭ – C – D – E – F♯ – G.
- **G classical melodic minor descending:** G – F – E♭ – D – C – B♭ – A – G.
- **E harmonic minor:** E – F♯ – G – A – B – C – D♯ – E.
- **F♯ major:** F♯ – G♯ – A♯ – B – C♯ – D♯ – E♯ – F♯ (not F natural as a written degree).
- **G♭ major:** G♭ – A♭ – B♭ – C♭ – D♭ – E♭ – F – G♭.

For chromatic scales, use a separate spelling strategy; do not force diatonic degree-by-degree spelling. MIDI pitch and spelling should both be validated. No arbitrary audio generated by this spec.

### 3.3 Required arpeggios

| Arpeggio | Pattern |
|---|---|
| Major triad | `[0,4,7]` |
| Minor triad | `[0,3,7]` |
| Diminished triad (P1) | `[0,3,6]` |
| Augmented triad (P2) | `[0,4,8]` |
| Dominant seventh (P1) | `[0,4,7,10]` |
| Diminished seventh (P2) | `[0,3,6,9]` |

Apply the same letter/spelling logic to chord degrees, with appropriately repeated tones across octaves. Do not claim an arpeggio is in root position if inversion was selected. Avoid prescribing fingerings the app cannot verify.

## 4. Range and octave contracts

An **N-octave ascending scale** starts at a tonic and ends at the tonic N octaves higher. One octave contains **8 displayed notes** (including terminal tonic); two octaves contain **15 displayed notes** before descending. An up-and-down two-octave scale with the top tonic played only once contains **29 notes**.

- Let user set one/two/three octaves, starting octave, and direction (`up`, `down`, `up-and-down`).
- For each request, calculate **all** written notes and check against hard register and pitch inventory before rendering.
- If no starting octave makes the entire request playable, explain incompatibility and offer a deliberate one-octave or starting-note alternative. **Never silently shorten, omit notes or transpose**.
- Default choice should fit comfortable range; only use extreme range with explicit selection.
- `G4→G6` in a two-octave G minor scale is valid within a flute profile that permits G6; `G3→G5` is not valid for a standard C-foot flute profile.
- For kalimba/ocarina, constrain to the actual configured pitches, including any missing accidentals, not just min/max note.

## 5. Exercise grammar: parameters, constraints and templates

A generated task is a **template + validated parameters**, never a random collection of written instructions.

### 5.1 Common parameters

```ts
type ExerciseRequest = {
  instrumentProfileId: string;
  family: 'scale'|'arpeggio'|'chromatic'|'tone'|'interval'|'articulation'|'rhythm'|'chord-change'|'pattern';
  tonic?: { letter: 'A'|'B'|'C'|'D'|'E'|'F'|'G'; accidental: -2|-1|0|1|2 };
  scaleType?: 'major'|'natural-minor'|'harmonic-minor'|'melodic-minor-classical'|'chromatic';
  octaveCount?: 1|2|3;
  startingOctave?: number;
  direction?: 'up'|'down'|'up-and-down';
  quarterNoteBpm?: number;
  rhythmId?: string;
  articulationId?: string;
  dynamicsId?: string;
  repetitions?: number;
  targetMinutes?: number;
  seed?: string;
};
```

Unset parameters may be chosen by rules; user-selected parameters are **hard constraints**, not suggestions. Validate compatibility before filling unset fields. Always store the fully resolved request alongside its seed and generator version.

### 5.2 Flute exercise families

| Family | Examples | MVP representation | Reflection |
|---|---|---|---|
| Tone / breath | 6–10 s middle-register long tones; crescendo–diminuendo; repeat soft attacks | Text instructions + timer, named target pitches | `Was the tone steady to the end?` |
| Register flexibility | Slow octave slurs, gentle interval patterns | Notes + slurs, controlled register | `Did the tone/pressure change abruptly?` |
| Diatonic scales | Major, natural/harmonic/melodic minor, 1–3 octaves when playable | Staff notation, metronome, key and pattern | `Which transition lost evenness?` |
| Chromatic | Semitone movement within a configured start/end | Staff notation | `Could you keep finger changes quiet/even?` |
| Arpeggios | Major/minor triads, 1–2 octaves | Staff notation | `Were the large leaps connected cleanly?` |
| Articulation | All tongued, groups of 2/4 slurred, 2 tongued + 2 slurred | Slur/tongue instructions attached to valid notes | `Was the first note of each group clear?` |
| Rhythm | Equal quavers/semiquavers; dotted long-short; reverse dotted | Correct note durations and beat grouping | `Was your pulse stable throughout?` |

Suggested flute warm-up: easy mid-register long tones → legato octave transitions → familiar-scale slow articulation. Repeated high-register or fast-tonguing challenges should not be the default opening drill.

### 5.3 Rhythm and articulation templates

**Supported rhythmic variants in MVP:**

- Even crotchets/quarters: 1 note/beat.
- Even quavers/eighths: 2 notes/beat.
- Even semiquavers/sixteenths: 4 notes/beat.
- Long–short: dotted eighth + sixteenth, repeated.
- Short–long: sixteenth + dotted eighth, repeated.
- Triplets (P1): 3 equal notes per beat, with appropriate tuplet notation.

Every rhythm template has explicit rational beat durations; the rendered bar(s) must sum exactly to the declared meter. If the note sequence doesn't fill a complete bar, add a correctly notated rest or use a single unmetered exercise convention—**never pad with unexplained notes**.

**Articulation presets:** all tongued; all slurred where musically meaningful; slur groups of 2/3/4/8; tongue 2–slur 2; slur 2–tongue 2. Pattern group sizes must be compatible with the length of the note sequence, or the final group must be handled explicitly. Repetitions and turnaround notes must not receive accidental ties or slurs into rests. Advanced double/triple tonguing is P1 and explicitly opt-in.

**Dynamics presets:** steady `p`, `mp`, `mf`, `f`; crescendo, diminuendo, crescendo–diminuendo across a sufficiently long phrase. Volume-based tasks must explain what to listen for, not claim volume was measured. For very short technical fragments, avoid a physically unrealistic full-range dynamic arc.

**Tempo:** provide an editable quarter-note BPM; default to a conservative profile-specific tempo, not a hard-coded `advanced = 160`. Example default 60–80 BPM for controlled re-entry. A metronome click is optional; scheduling should use Web Audio clock where available, and stop when session is paused/left. The app does **not** listen to determine whether the tempo was achieved.

## 6. Generator pipeline (required implementation)

```text
1. Load profile + user request + recent practice history.
2. Build eligible exercise templates for that instrument.
3. Apply all explicit constraints (family, key, tempo, octaves, range, etc.).
4. Fill unspecified parameters from safe defaults or weighted sampling.
5. Construct scale/arpeggio as spelled written pitches + sounding semitones.
6. Choose the starting octave and orientation; validate every note against
   range, pitch inventory, supported articulations, and instrument mode.
7. Apply rhythmic durations, slurs, dynamics, measures and repetitions;
   validate beat totals and each rendered note.
8. Produce immutable resolved exercise with `seed`, `generatorVersion`,
   `whySuggested`, instructions, content, expected duration and prompt.
9. Render notation (or text-only for a non-notated tone exercise).
10. Save feedback after practice; never rewrite completed exercise history.
```

**Generate/validate separately from rendering.** Renderers must not introduce new music choices. A screenshot or PDF renderer is not a substitute for correct music theory.

### 6.1 Reproducibility

A request with the same `generatorVersion`, `seed` and profile snapshot produces exactly the same resolved content. Use a seedable PRNG for variation; do not use `Math.random()` deep in music generation. If the profile changes later, historical exercises still retain the resolved notes and options so a journal entry remains meaningful.

### 6.2 Variety and weakness-aware sampling (P1)

Build a pool of **valid** options first. Then weight items according to:

```text
priorityScore = 2 * explicitUserPriority
              + 1.5 * unresolvedGoalWeight
              + 1.0 * timeSincePractisedWeight
              + 1.0 * selfReportedDifficultyWeight
              + 0.5 * varietyWeight
              - 1.5 * recentExactRepeatPenalty
```

Weights are illustrative and should be tunable; none may override validity, playability or explicit user settings. Normalise weights to avoid scores becoming dominated by missing history. Explain the top reason in UI (`You haven't practised this key recently` or `You marked tonguing as difficult`). When history is empty, use balanced sampling and safe defaults. Do not assign a numeric quality grade from absence of audio analysis.

### 6.3 Parameter compatibility examples

- A `two-octave B3→B5` exercise is **not valid** for a flute configured with C4 as its lowest note.
- A kalimba configured to diatonic C major cannot be tasked with `F#` unless an actual F♯ tine is configured.
- A long-tone exercise is not given a semiquaver rhythm.
- An ukulele chord-transition exercise uses chord-shape presets compatible with its tuning, not a flute breath-control prompt.
- A `G harmonic minor` request must not quietly become `G natural minor` because of an F♯ spelling issue.
- A user-selected tempo of 80 BPM stays 80 BPM; changing it requires explicit user action.

## 7. Session generator and time budget

The session planner composes **practice activities**, some of which may call the technical generator. It is not the same function as `generateScale()`.

| Total | Warm-up | Technique | Repertoire | Reflection |
|---:|---:|---:|---:|---:|
| 10 min | 2 | 3 | 4 | 1 |
| 20 min | 4 | 5 | 9 | 2 |
| 30 min | 5 | 8 | 15 | 2 |
| 45 min | 7 | 12 | 23 | 3 |

For 5 minutes, suggest a gentle 1-minute warm-up, 2-minute priority activity, 1-minute enjoyable piece/passage and 1-minute reflection. A user may replace any block or start from a saved warm-up template. For custom lengths, scale and round allocations with a largest-remainder method so integer minutes **sum exactly** to the requested duration.

**Modes:**

- `Balanced`: default ratios above, with orchestra passage preferred when a live priority exists.
- `Orchestra soon`: shift more repertoire time to orchestra; optionally reduce solo time.
- `Technical`: shift repertoire time toward technical exercises.
- `Just for enjoyment`: keep a warm-up and short reflection, mostly favourites.
- `Deadline week`: minimal setup, 5–10-minute plans, no guilt language.

Prompt selection should favour a stated goal: if a piece is marked `Dynamics`, ask a dynamics-focused question rather than a random unrelated question. Never require answering every journal category.

## 8. Fully resolved sample exercises

### Example A — flute G harmonic minor

- Goal: even finger changes and clean slurred groupings.
- Scale: `G harmonic minor`, two octaves, **G4 to G6 and back**, if playable in configured comfort range.
- Notes ascending: `G4 A4 B♭4 C5 D5 E♭5 F♯5 G5 A5 B♭5 C6 D6 E♭6 F♯6 G6`.
- Descending: reverse spelled harmonic-minor sequence, with G6 not repeated, down to G4.
- Articulation: slur in groups of four; note explicitly how the final one-note group is treated, or repeat a scale cell with appropriate grouping.
- Rhythm: even quavers; quarter-note pulse 80 BPM.
- Dynamics: `mf`, steady.
- Reflection: `Which finger change was least even? Did slurs remain smooth at the turn?`
- Log: achieved BPM (manual), difficulty, next action.

### Example B — flute long-tone crescendo

- Goal: keep tone and intonation subjectively steady while changing dynamics.
- Pitches: B4, A4, G4 (adjust to range/preferences).
- Instructions: each note 8 seconds, approximately 2 seconds `mp`, 4 seconds crescendo to `f`, 2 seconds diminuendo back to `mp`; relaxed rest between repetitions.
- Repeat each twice, short rests; adjust if fatigued.
- No fake measured decibel or timbre score; user listens to optional self-recording.
- Reflection: `Did the sound thin or become strained as I got louder?`

### Example C — piano, later milestone

- `F major`, two octaves, right hand alone, even quavers at 60 BPM; basic supported notation without unverified fingering labels. Add hands-together/contrary motion after independently testing these generators.

### Example D — kalimba, later milestone

- A configured C-major diatonic tine inventory permits a C–E–G–E pattern. It does **not** permit an arbitrary B♭ or F♯ without a configured tine. Show layout-based cues only for verified mappings.

## 9. Notation and interface contract

- For pitched drills, show staff notation with clef, key signature, meter (or explicit unmetered convention), notes with accurate accidentals, rhythm, slurs and dynamics.
- Provide accessible equivalent text (spelled notes and instructions) and a `Regenerate` button.
- The `Play reference` button is optional later; do **not** pretend it reproduces a person's timbre or teaches acoustical technique.
- VexFlow (TypeScript, SVG/Canvas) is a suitable notation renderer. Create a separate `ExerciseModel -> NotationAdapter`; keep canonical music data renderer-agnostic.
- Do not depend on rendering every possible irregular rhythm in MVP: limit templates to those covered by tests, and expand after verification.
- User can lock a selected key, rhythm, articulation or range and randomise only unlocked fields.
- Include `Try easier version` / `Try harder version` with explicitly described changes, e.g. `80→72 BPM` or `2→1 octave`, not silent adaptation.
- Display one main technical focus rather than a screen of 20 arbitrary exercises.

## 10. Test obligations and release criteria

The generator is **not complete** until these pass:

1. All 12 pitch classes across major, natural minor, harmonic minor and classical melodic minor, ascending and descending, produce correct semitone sequences and diatonic spelling.
2. All named spelling fixtures above, including F♯/G♭, match expected written notes.
3. One-, two- and three-octave directions have correct first/last notes and note counts (where playable).
4. Generated notes never escape configured range, pitch inventory or supported instrument exercise types.
5. All rhythm patterns have mathematically valid total durations and the notation matches the model.
6. Same seed/profile/version gives byte-for-byte equivalent resolved exercise content.
7. Impossible requests get a visible explanation and feasible alternatives—never an invented/partial score.
8. A skip, `too hard` or a missing history item doesn't prevent future practice.
9. History retains exactly what was generated and played, even after preferences change.
10. Run actual iPad Safari checks for notation sizing, metronome controls and offline availability.

See [acceptance tests](ACCEPTANCE_TESTS.md) for Given/When/Then fixtures.

## 11. Music-specific data types (proposed)

```ts
type SpelledPitch = { step: 'A'|'B'|'C'|'D'|'E'|'F'|'G'; alter: number; octave: number; midi: number };
type NoteEvent = { pitch: SpelledPitch; durationBeats: number; articulation?: string; tie?: 'start'|'stop'; dynamics?: string };
type RestEvent = { rest: true; durationBeats: number };
type ResolvedExercise = {
  id: string;
  generatorVersion: string;
  seed: string;
  instrumentProfileSnapshot: object;
  request: ExerciseRequest;
  family: string;
  writtenEvents?: Array<NoteEvent|RestEvent>;
  meter?: { beats: number; beatUnit: number };
  instructions: string[];
  reflectionPrompt: string;
  expectedMinutes: number;
  whySuggested?: string;
  createdAt: string;
};
```

`durationBeats` can be represented using integer ticks or rational fractions instead of floating-point when implementing; avoid accumulating float rounding in bar validation. This schema is illustrative, not a finished API contract.
