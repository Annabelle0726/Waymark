# Waymark repository instructions

## Working agreement

- All project-owned Markdown MUST be written in English, including headings, examples, checklists and command comments. Keep the product's existing UI language.
- Work in the existing primary checkout. Fetch upstream before starting. Preserve staged and unstaged work; publish only the requested changes.
- Waymark is a local React, TypeScript, Node.js and SQLite application started with Docker Compose.
- Keep keys, private configuration, databases, uploaded files, backups and logs out of Git, frontend assets and image build contexts.
- Require authentication before opening a workspace. New accounts start empty. Use explicitly fictional records and isolated storage for acceptance tests.
- Preserve original sources. Leave unverified job details unconfirmed and unsupported personal experience incomplete. Before any online generation, show the editable outgoing excerpt and require explicit confirmation.

## Account identity

- Phone numbers are REQUIRED for registration and sign-in. Use a phone number as the primary account identifier; MUST NOT provide email-only registration or regular email-only sign-in.
- The local first version uses a phone number and password. Normalize numbers consistently on the server, validate them in both client and server, and enforce unique phone numbers in storage. Accept mainland China mobile numbers and international numbers with a country calling code.
- A stored phone number is not proof of ownership. Until an actual SMS service is configured and tested, MUST NOT display a verified-phone status, claim to send verification codes, or offer simulated SMS authentication.
- Preserve existing accounts and their owned records. A legacy email account may authenticate with its existing credentials only as part of a required phone-binding flow; require a valid, unique phone number before issuing a new session. Never delete records or create a replacement workspace during migration.
- Treat phone numbers as private account information. Keep them out of public examples, logs, source control and image layers. Use isolated fictional accounts for tests.

## UI and interview preparation

- Before any UI or styling change, you MUST read and follow the [UI rules](src/styles/agent.md). After the change, complete their pre-commit checklist.
- Keep general and job-specific preparation independent. Preserve named review groups with individual question-and-answer blocks, one shared draft across editor views, and compatibility with existing notes.

## Source ownership

| Path | Responsibility |
| --- | --- |
| `src/app/` | Shell, navigation and page composition |
| `src/features/` | Authentication, jobs, materials, preparation and settings |
| `src/components/` | Shared forms, dialogs and brand components |
| `src/domain/` | Data types, pure transformations and compatibility readers |
| `src/services/` | Client communication with the local API |
| `src/styles/`, `public/brand/` | Stylesheets, UI rules and public brand assets |
| `server/` | Authentication, ownership checks, local storage, OCR and optional integrations |

Keep only the entry point and environment declarations at the source root. Reuse existing authentication, persistence and access checks. Update imports, the README and the Docker allowlist when moving source files.

## Verification

Run `npm run build` for implementation changes. Check the production entry with `docker compose up -d --build --wait` when runtime or packaging changes. For editor changes, test saving, failure recovery, focus mode and refresh. For storage changes, verify that an account can access its existing records and download original attachments after a container rebuild. For documentation-only changes, check paths, links, technical values and the English-language requirement.
