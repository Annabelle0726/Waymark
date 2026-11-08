# Waymark personal job workspace

Waymark runs on your computer. React and TypeScript provide the web interface. Node.js and Express handle authentication, files and account-scoped workspace requests. One Docker container serves the website and API. SQLite stores records and attachment bytes on the host.

## Start locally

Install Git and Docker Desktop with Linux containers on Windows, or Docker Engine with Docker Compose v2 or later supporting `--wait`. The first build downloads the base image, packages and OCR dependencies. Once built, the local workspace runs offline.

From a new computer, clone the repository. For an existing checkout, open PowerShell in the project directory.

```powershell
git clone https://github.com/Annabelle0726/Waymark.git
cd Waymark
```

```powershell
docker compose up -d --build --wait
docker compose ps
```

Open the [local workspace](http://127.0.0.1:4173). The published port accepts loopback connections. Sign in or register for an empty personal workspace. A valid session restores your workspace on refresh. Signing out returns you to authentication.

Compose mounts `data/` for storage and `private/` read-only for configuration. On native Linux, create both directories first. Container UID 1000 needs write access to `data/` and read access to `private/backend.env` if present. To use a different port, set `WAYMARK_PORT=4174` in the local root `.env` file and repeat the startup command.

## Using the workspace

- **Jobs.** Each position has its own ID, even at the same company. Expand a sidebar entry to see its platform, progress and update time. Add a job through manual entry, a link, pasted text or screenshots. Review the fields before saving.
- **Sources.** The original text, link, screenshot or manual snapshot stays with the job. The text parser accepts one supported field label and value per line, separated by a colon. Links retain the address. Missing fields stay unconfirmed. Keep personal additions separate from source text. Progress updates record their time and source.
- **Screenshots.** Select, drop or paste PNG or JPEG images. Local Tesseract reads Simplified Chinese and English in the Docker image. Review the extracted text and candidate values. Add further screenshots to fill empty fields, enlarge thumbnails, or remove individual images before saving. Each image can be up to 10 MB, with up to 40 MB of new images per submission. Unreadable or partial images can still be retained as sources. See the [intake specification](docs/screenshot-intake.md).
- **Preparation.** Write a self-introduction and add named sections. In focused review, use groups containing individual questions and editable answers. Prompts are placeholders. General preparation and individual job notes are saved independently. Older plain-text notes open in a legacy section. Normal and enlarged editing share one draft. Use the editor's save controls or Ctrl/Cmd + S. On a version conflict, copy the unsaved text, refresh and merge your edits.
- **Materials.** Upload, rename, summarize, preview, download, replace or delete account-owned files. Each file can be up to 10 MB. Local previews support PDF, DOCX, PNG, JPEG, GIF, WebP, and UTF-8 TXT, Markdown, CSV and JSON. DOCX previews preserve paragraphs and tables. Download the original for complex layouts, embedded images or unsupported formats such as DOC.
- **Settings.** View your email, edit your nickname, sign out, or confirm your password to delete the account and its data. Passwords use salted scrypt hashes. Sessions use HttpOnly cookies. The API checks account ownership for workspaces and attachments. Anyone with access to the host database or Docker administration can read local data.
- **Integration scope.** Interview preparation requires no API key. The optional DeepSeek backend accepts a key in `private/backend.env`; the empty template is `backend.env.example`. The preparation UI has no online drafting entry. Mini programs, cross-device sync, recruiting-platform authorization, personal agent integration, automatic applications, outbound messages and email password recovery are outside the current implementation.

## Stop, update and inspect logs

```powershell
docker compose stop
docker compose start
docker compose logs --tail=80 app
```

To remove the container and network, run `docker compose down`. Run `docker compose up -d --wait` to reuse the existing host data. Back up before updating, then run:

```powershell
git pull --ff-only
docker compose up -d --build --wait
```

Application logs omit request bodies, private records and API keys. Use `docker compose config --quiet` to validate configuration without printing resolved values.

## Storage, backup and restore

The default host database is `data/workspace.sqlite`, mounted under `/var/lib/waymark`. Accounts, sessions, jobs, history, notes, material metadata and attachment bytes reside in it. SQLite may also create `workspace.sqlite-wal` and `workspace.sqlite-shm`. Keep the same host directory when replacing the container. Keep private configuration in `private/backend.env`.

For the default directory, stop every service writing to this database, including any native development process. Run the following PowerShell commands in one terminal:

```powershell
docker compose stop
$backupDir = Join-Path $env:USERPROFILE ("Waymark-Backups/" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item -LiteralPath ./data -Destination $backupDir -Recurse -ErrorAction Stop
Get-ChildItem (Join-Path $backupDir "data") -Name
docker compose start
```

Backups include private records and sessions. Store keys separately. Restore into a fresh directory so the current database stays available:

```powershell
$backupDir = Read-Host "Backup directory containing the data folder"
$restoreDir = Join-Path $env:LOCALAPPDATA ("Waymark-Restored/" + (Get-Date -Format "yyyyMMdd-HHmmss"))
if (-not (Test-Path (Join-Path $backupDir "data/workspace.sqlite"))) { throw "Backup database missing" }
New-Item -ItemType Directory -Path $restoreDir -ErrorAction Stop | Out-Null
Copy-Item -LiteralPath (Join-Path $backupDir "data") -Destination $restoreDir -Recurse -ErrorAction Stop
$env:WAYMARK_DATA_DIR = Join-Path $restoreDir "data"
docker compose up -d --force-recreate --wait
```

Sign in, check a job and note, and download an attachment. To keep using the restored directory across terminals, set `WAYMARK_DATA_DIR=C:/actual/path/data` in the local root `.env`. Use forward slashes for Windows paths there. Moving to a new computer requires copying data and private configuration yourself.

Deleting an account, removing the data directory, or overwriting a database with an older copy can destroy records. Copying only the main file may omit pending WAL writes. Keep backups and private configuration out of Git and public storage.

## Development

Use Node.js 24.14 or later in the 24.x series. Docker users do not need Node.js on the host. For a separate development database:

```powershell
$env:WAYMARK_DATA = Join-Path $env:LOCALAPPDATA "Waymark-dev/data"
npm ci
npm run dev
```

Open the [development workspace](http://127.0.0.1:5173). Native screenshot OCR requires `tesseract` on PATH and the `chi_sim` and `eng` language packs. Run `npm run build` for type checking and the production web bundle. Use `npm start` to serve the built app.

See the [repository instructions](agent.md) for source organization, privacy and UI change requirements. Workspace revisions detect conflicting writes. Job updates and their attachments commit in one SQLite transaction.
