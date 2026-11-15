# Architecture, data, privacy and external-file handling

**Architecture decision:** static, installable **local-first PWA**. GitHub Pages hosts only compiled app assets and generic built-in exercise templates; it is not the personal-data database. All personal information is on-device until the user explicitly exports it.

## 1. Proposed stack

| Concern | Technology | Reason / constraint |
|---|---|---|
| UI | React + TypeScript + Vite | Small static app, typed internal model, fast development |
| Styling | CSS/Tailwind | iPad-friendly, responsive, accessible |
| Offline | `vite-plugin-pwa` + service worker | Cache versioned app shell; avoid caching sensitive external URLs |
| Local records | IndexedDB with Dexie | Indexed records, relations and Blob storage |
| PDF viewing | PDF.js | Display locally imported PDF files; **not** music recognition |
| Notation | VexFlow | Render verified scale / arpeggio notation to SVG/Canvas |
| Metronome | Web Audio API | Schedule audio in foreground; explicit click/tap unlock on iOS |
| Recording | `getUserMedia()` + `MediaRecorder` | User-initiated recording; runtime MIME capability detection |
| Export | JSON metadata + optional ZIP of binary attachments | Verifiable, portable backup; streaming/chunking where practical |
| Static deployment | GitHub Pages + GitHub Actions | HTTPS and public static distribution |
| Tests | Vitest + Testing Library + Playwright | Unit/property tests plus end-to-end flows; real iPad Safari manual QA |

Notes: Project Pages (`username.github.io/repo-name/`) require the correct Vite `base: '/repo-name/'` and service-worker/asset paths. Build via GitHub Actions. Don't put credentials, private URLs or score PDFs in the repository. References: [Vite GitHub Pages instructions](https://vite.dev/guide/static-deploy); [GitHub Pages visibility warning](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site); [VexFlow](https://github.com/vexflow/vexflow).

## 2. Data boundaries and ownership

```text
Public GitHub repository -> bundled app code, static assets, generic templates
                                |
                                v
                         Installed PWA on iPad
                                |
                     IndexedDB (private per origin)
                    /          |             \
              pieces/folders  journal      Blob assets
                                  
  External Drive/YouTube URL -> only opened if user taps it
                                  (requires network + source permissions)
  Export -> user-controlled JSON / ZIP file in Files or iCloud Drive
```

A GitHub Pages site can be publicly accessible even when backed by a private repository. **Never rely on repository visibility to protect personal content published with the site.**

### Local-first security rules

- Microphone permission is requested only on a direct user action. Never upload recordings or send them to analytics.
- Don't persist Google authentication tokens (none in v1). `Drive links` are **bookmarks**, not authorised Drive API sessions.
- Treat externally supplied titles, links and metadata as untrusted. Escape text and allow safe URL schemes (prefer `https:`); never inject arbitrary HTML.
- A shared Drive URL can itself contain an access/resource key; storing it locally protects it from publishing but not from anyone with access to the device or an unencrypted backup.
- No service-worker caching of third-party copyrighted or access-restricted resources. Cache only app assets and the local files explicitly imported and stored in IndexedDB.
- Support removing a source, deleting a saved recording, deleting a journal entry and clearing local app data—with confirmation where destructive.
- Local browser storage is not inherently encrypted with an app-specific password. Do not advertise end-to-end encryption or secure cloud sync in v1.

## 3. Suggested domain model

Use stable UUIDs and foreign keys. Store one piece object once; **folders and pieces have a many-to-many join table**.

| Table / store | Key fields | Notes |
|---|---|---|
| `instrumentProfiles` | `id`, `kind`, `name`, `settings`, `updatedAt` | Multiple profiles of same kind allowed; settings versioned |
| `folders` | `id`, `parentFolderId?`, `name`, `sortOrder`, `instrumentFilter?` | Arbitrary tree; detect/prevent parent cycles |
| `pieces` | `id`, `title`, `composer?`, `status`, `priority`, `goal?`, `updatedAt` | One durable journal identity regardless of folders |
| `pieceFolders` | composite `[pieceId, folderId]` | Unique edge; removing folder removes edge, not piece |
| `pieceInstruments` | composite `[pieceId, profileId]` | Supports multi-instrument arrangements |
| `sources` | `id`, `pieceId`, `type`, `url?`, `blobId?`, `label`, `page?` | PDF upload, Drive bookmark, web score or YouTube |
| `blobs` | `id`, `mimeType`, `sizeBytes`, `sha256?`, `data: Blob` | PDFs/audio; ideally deduplicate via hash |
| `passages` | `id`, `pieceId`, `label`, `page?`, `barStart?`, `barEnd?` | Optional manual markers; no automatic score parsing |
| `journalEntries` | `id`, `pieceId`, `sessionId?`, `passageId?`, `focus`, `rating?`, `reflection`, `nextAction?`, `createdAt` | Append-only history with edit support; journal independent of folder |
| `recordings` | `id`, `pieceId`, `entryId?`, `passageId?`, `blobId`, `lengthSec`, `label`, `createdAt` | Only user-saved milestones remain |
| `technicalTemplates` | `id`, `instrumentKind`, `family`, `templateVersion`, `constraints` | Versioned defaults/shipped definitions |
| `technicalExercises` | `id`, `profileId`, `generatorVersion`, `seed`, `resolvedContent`, `createdAt` | Immutable generated notes/instructions and profile snapshot |
| `exerciseAttempts` | `id`, `exerciseId`, `sessionId?`, `status`, `achievedBpm?`, `notes?`, `createdAt` | User-reported, never auto-scored |
| `practiceSessions` | `id`, `profileId`, `requestedMinutes`, `mode`, `createdAt`, `endedAt?` | Session metadata |
| `sessionActivities` | `id`, `sessionId`, `position`, `kind`, `pieceId?`, `exerciseId?`, `plannedMinutes`, `actualMinutes?`, `status` | Plan and completed outcome |
| `settings` | `key`, `value`, `updatedAt` | Theme, backup reminders and preferences |

Indexes to support: folder children by parent, piece/folder by both edges, piece journal by `[pieceId+createdAt]`, exercise attempts by profile/date, source by piece, sessions by date. Use indexed retrieval, not full database scans, for the main Library view.

### Example piece and source (illustrative only)

```json
{
  "piece": {
    "id": "piece-uuid-001",
    "title": "Hungarian Dance No. 5",
    "composer": "Johannes Brahms",
    "status": "learning",
    "priority": 2
  },
  "folderIds": ["flute-favourites", "current-pieces"],
  "sources": [
    {"id": "source-1", "type": "external-drive", "label": "My arrangement", "url": "https://drive.google.com/file/d/EXAMPLE/view"},
    {"id": "source-2", "type": "local-pdf", "label": "Offline copy", "blobId": "pdf-blob-uuid"}
  ]
}
```

The example URL is intentionally a placeholder. The app must never auto-publish real Drive links.

## 4. Flexible folders semantics

- Folder tree is user-defined and **may be nested arbitrarily** (with a reasonable UI depth, but no hard content-category taxonomy).
- A piece can be in `Flute / Favourites` and `Orchestra / This term` simultaneously, with one file/journal/history.
- Keep a separate `instrument` relation and `tags`; a piece's folder location does not define its instrument.
- Drag/drop or multi-select membership editing is desirable; on iPad provide an accessible `Add to folder...` alternative.
- Deleting a folder removes its edges/subfolder relation only after confirmation. Items remain visible in `All pieces`; moving a folder must never create a cycle.
- Deleting a piece asks separately whether to delete its associated local blobs / recordings; avoid orphaned blobs and keep deletions reversible where reasonable.
- Reorganising folders must not change existing `pieceId`, journal entries or recording ownership.

## 5. Sources: local PDFs vs Google Drive links

### V1 — simple and reliable

1. User chooses `Add source` → `Import PDF` (Files picker) **or** `Add link`.
2. If `Import PDF`: validate MIME/extension, show filename + size, store Blob in IndexedDB, display using PDF.js and mark `Available offline` after storage succeeds. Do not make unsupported claims about Apple Pencil annotation.
3. If `Add link`: save the original URL, a label and source type (Drive/web/YouTube). The `Open` action opens the original link; it can require sign-in and internet.
4. Never assume a private Drive link can be fetched, scraped, embedded in an iframe or made available offline. If the user wants offline access, have them explicitly download/import a permitted copy using Files.
5. A piece may have both a Drive bookmark and a locally imported PDF, with separate availability indicators.

### Later — optional Drive integration

A true `Browse my Google Drive` feature is a **new feature**, requiring Google account sign-in, OAuth configuration, permission scopes, refresh/reauthorisation design, API quota/cross-origin error handling and privacy review. Use the Drive API rather than guessing a universal direct-download URL. Do not store client secrets in the public app; OAuth PKCE for browser clients would need careful review. Google documents authenticated file download using Drive API and permission restrictions: [Drive API downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads), [Drive sharing](https://support.google.com/drive/answer/2494822?hl=en-uk).

## 6. Audio recording lifecycle

```text
Tap Record -> request mic permission -> detect supported mime -> start
  -> show elapsed and Stop -> stop tracks -> temporary Blob -> Play
  -> [Save milestone => IndexedDB] OR [Discard => release temporary Blob]
```

- Use `MediaRecorder.isTypeSupported()` and test actual creation. Do not hard-code `audio/webm` on iPad; fall back to a supported MIME type or default recorder configuration.
- Allow saving recordings with passage description and optional reflection. Default is **not saved**; no recording accumulates silently.
- Keep short recordings as the initial interaction (e.g. suggest 15–60 seconds), but allow longer within storage guardrails.
- If permission denied, the user can continue using journals and PDF scores normally.
- If audio recording is interrupted by OS backgrounding or another app, show a recoverable error. Foreground recording on the actual iPad is an acceptance test.
- Stop input tracks on stop, error or screen exit; revoke temporary Object URLs when safe.
- Browser APIs: [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder), [MIME support detection](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static).

## 7. Browser persistence, offline and backups

### Storage

- Prefer Dexie/IndexedDB for structured content **and** blobs. `localStorage` may be used only for noncritical tiny UI preferences.
- After first online load and installation, service-worker precache enables the app shell offline; the score viewer loads explicitly imported PDFs from IndexedDB.
- Call `navigator.storage.estimate()` to display approximate usage; attempt `navigator.storage.persist()` when suitable and report whether the browser granted it.
- Warn about insufficient storage, `QuotaExceededError`, failed blob writes, unexpected database migration errors.
- WebKit's storage policy can evict best-effort browser data under pressure, so **exports are essential even for a Home Screen app**. Reference: [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/).
- Browser data is linked to an origin and browser context; don't promise that Safari and an installed PWA automatically share one data store or sync across devices. Test the installation context and advise importing a backup if necessary.

### Backup format — V1 contract

A full backup consists of a ZIP archive containing:

```text
backup-manifest.json     # formatVersion, appVersion, exportedAt, counts, blob manifest
records.json             # normalized records / relationships / exercises / history
blobs/<uuid>.<ext>       # only if Include PDFs and recordings was selected
```

- Separate `Metadata only` and `Full backup (PDFs/audio included)` buttons; show projected byte count before starting.
- Manifest includes sha256 for included blobs where feasible, so restores can verify integrity.
- `formatVersion` permits explicit migrations; refuse unknown future versions with a useful error, never silently corrupt data.
- Import shows a preview (piece and attachment counts), asks whether to `Restore into empty library` or `Merge by ID` (later; may restrict initial MVP to empty database), and checks errors before committing.
- Restoring should preserve stable IDs, folder membership, recordings-to-piece links, journal entries and instrument profiles.
- An archive without blobs cannot magically restore local PDF/audio; mark those attachments as missing and keep metadata intact.
- User decides where to save the ZIP, including Files/iCloud Drive. The app does **not** automatically upload backups.
- If large ZIP export causes Safari memory issues, implement chunked export or offer smaller backups; document limits tested on target iPad.
- Optional reminders to export when the last full backup is old; no mandatory popups every session.

## 8. PWA and deploy details

- Use manifest with app name, icons, `display: standalone`, theme colours and scope/start URL respecting GitHub Pages repository path.
- Use HTTPS deployment, install via Safari `Share → Add to Home Screen`.
- Avoid caching third-party Drive URLs; use origin-scoped cache and versioned app assets only.
- When deploying a new app version, ensure IndexedDB schema migrates safely; service-worker updates must not erase user data.
- Show offline banner and disabled/explained Drive links if navigator reports offline; don't rely solely on connectivity detection since authenticated links can still fail.
- Test code splitting/cached assets to make sure the entire app shell and core generated exercises work offline after installation.
- Static app can run fully without a database server. A GitHub repository sync feature is a **separate** optional integration with explicit authentication; never embed personal access tokens in published code.

## 9. Privacy threat model (short)

| Risk | Mitigation |
|---|---|
| Accidentally publishing private score links/files | Static repo contains only generic app data; never push local DB/blob exports |
| Lost iPad, cleared web data, browser eviction | Versioned user-controlled full backups and restore tests |
| Private Drive link exposed via screenshot/export | Show external-link disclosure; backups not automatically shared or encrypted |
| Recording without intent | Mic gated by visible explicit Start, track stopped after use |
| Large audio files exhaust storage | Temporary-by-default recording, explicit save, size display and deletion |
| Invalid scale or impossible range | Separate deterministic music engine, range validation, fixtures/property tests |
| Untrusted URLs/content | Safe URL schemes, escaped metadata and no untrusted HTML execution |
| Corrupt app update | Idempotent DB migrations and restore smoke test |

## 10. Sources and current platform assumptions

- Vite deploy guide: https://vite.dev/guide/static-deploy
- GitHub Pages access warning: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- WebKit quotas/eviction: https://webkit.org/blog/14403/updates-to-storage-policy/
- MDN persistent storage: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- MDN MediaRecorder format detection: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static
- Google Drive API file downloads: https://developers.google.com/workspace/drive/api/guides/manage-downloads
- VexFlow notation library: https://github.com/vexflow/vexflow

These are design references; perform device tests before promising perfect offline, microphone, storage or full-screen behaviour on a particular iPadOS version.
