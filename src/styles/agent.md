# Waymark UI rules

## 1. Scope and visual treatment

- All new or modified UI MUST pass the final checklist at **1440px and 375px**. Record simulated viewports as simulations.
- Pages MUST read as compact documents. Separate content with spacing and a single fine divider. MUST NOT stack heavy bordered containers.
- Preserve the local mountain-and-sea artwork, cool surfaces, deep-blue text and blue actions. Reserve gold for the brand star and small accents. MUST NOT introduce paper textures, notebook ornaments or gold frames.
- Preserve the transparent mark's aspect ratio in `public/brand/mark.svg`. The sign-in landscape in `public/brand/mountain-sea.svg` MUST be decorative and carry no instructions.
- On wide authentication screens, keep the landscape beside the form and a single light-blue translucent form surface. Use the existing segmented sign-in/register control, shared field outlines and blue primary action. MUST NOT add another frame or elevation to the form.

- Authentication shell MUST stay within 1200px, with a 400–440px form where space permits. Center the landscape and form on one grid; place the local illustration below the brand copy. Align the segmented control to the form width. Center the submit label and arrow together and preserve the button size during loading. Use the existing 200ms ease-out feedback for the white selected segment, panel and errors, subject to the motion rules below.

## 2. Corner radii

| Element | Required treatment |
| --- | --- |
| Card, panel, popover | Default 8px; use 10px for a larger surface. Maximum 12px. |
| Regular button, input, select | 8px via `--radius-control`; a compact variant may use 6px. |
| Centered dialog | 12px on all four corners. |
| Mobile bottom sheet | 12–16px on the two top corners; square bottom corners. |
| Small status tag or badge | May use a full pill. Buttons, cards and inputs MUST NOT use a pill. |

- Siblings at the same level MUST use the same radius. For an inset surface following an outer contour, use `max(0, outer radius - inset)`. Example: a 12px shell with 4px inset has an 8px inner contour.
- Components MUST reference radius tokens. Decorative dots or circular icons do not define their button's hit area. MUST NOT apply 16px or larger rounding to cards.
- **Existing token:** `--radius-control: 0.5rem` (8px at a 16px root). Reuse it for 8px corners, including cards. MUST NOT introduce a second 8px token.
- **Proposed, pending owner approval:** add `--radius-sm: 0.375rem` (6px), `--radius-panel: 0.625rem` (10px), `--radius-dialog: 0.75rem` (12px), `--radius-sheet: 1rem` (16px), and `--radius-pill: 9999px` in `src/styles/theme/tokens.css`. These names are not available in CSS yet. MUST NOT implement them or reference undefined variables before approval.

## 3. Content bounds and headings

- Job headers MUST use the local mountain-and-sea image with a readable light wash. Desktop metadata places location, remote requirement, update time and source on one wrapping row. Keep edit/update buttons equal at 112 by 44px, or 44px square with accessible labels on mobile. Salary and progress MUST be separate compact tags, with salary text at 15px. Mobile header bottom padding MUST be 16px; avoid a fixed minimum height.

- Jobs, preparation, materials and settings MUST share the workspace gutter for the topbar and main column. Feature styles MUST NOT offset the breadcrumb. Anchor the preparation heading, introduction and normal editor to that same start even when the sidebar is collapsed.

- The breadcrumb MUST start with an operable sidebar toggle directly before the workspace label. Align left-aligned page content with the left edge of the toggle icon, using the same gutter. Center the 16px glyph on both axes inside a 32px desktop button or 44px mobile target. Keep its left edge on the content gutter. On desktop, collapsing MUST release the sidebar column and leave the toggle reachable. On mobile, use the navigation drawer. Both controls MUST expose their accessible name, controlled region and expanded state.

- Reading, form and settings content MUST have a 640–720px column cap. Prefer `--content-width-compact` (44rem / 704px). Individual fields and short sign-in forms may be narrower.
- Editors use 760–820px; the document editor uses 50rem / 800px. Lists and tables follow the available space with 24–32px desktop gutters and an approximately 1100px maximum content width, aligned left with the breadcrumb. Avoid large blank margins on both sides of list pages.
- Keep the primary action on the heading row at the column edge. A breadcrumb naming the page MUST NOT be followed by the same large title. If another heading is needed, use a compact heading sharing the action row, without an accent bar.
- Keep the local-space indicator in one global location. MUST NOT repeat the privacy notice in each page footer.
- Outside an intentional empty state, MUST NOT reserve a viewport-sized blank area. Size sections to their content.

## 4. Surfaces, rows and spacing

- Allow at most one level of section containers with a border or background per page. Inside that level, use indentation, headings and 1px dividers. MUST NOT nest cards.
- Use list rows 56–64px high for single-line items; allow content to wrap and grow. For example, a 56px row uses `--control-height` plus `--space-3`.
- Default card and panel padding MUST be 16–20px on desktop and 12–16px on mobile. Never exceed 24px. Lists and cards MUST have no shadow. Reserve light elevation for floating menus and dialogs; preserve visible keyboard focus independently.

- For a materials table, align the column start with the breadcrumb, keep the upload action on its right edge and show the shared column header even for one file. Use 24–32px desktop page gutters. Ellipsize long filenames; provide the full name in the accessible label.
- For striped tables, use the shared :root row tokens in theme/tokens.css for odd/even, hover, selected, border, text and accent. Row backgrounds reference --row-bg-odd, --row-bg-even, --row-bg-hover and --row-bg-selected. Recompute stripes from visible rows after searching or filtering and restart per group. Use one container border and a header divider; MUST NOT outline every row. Material rows are 52–56px on desktop, with a header even for a single result. Check 4.5:1 text contrast on every row state.
- At 640px and below, hide the table header and summary column, show type and date on a second line and move download into the menu. Sheet actions MUST be at least 48px high. A file deletion confirmation MUST name the file and explain that deletion is permanent.

## 5. Typography

- Use the existing offline `--display-font` stack for brand, headings and body. Use at most four levels: page 20–24px, section 16–18px, body 14–15px, supporting text 12–13px. Heading weight MUST be 600.
- Body line height MUST be 1.6–1.7. Check mixed Chinese and Latin strings, long job titles, filenames and dates at both widths. Use `--muted` for secondary text where it achieves at least 4.5:1 on its actual surface. Otherwise use `--ink`.
- Keep one thin-line icon family. Icon-only controls MUST have accessible names.

## 6. Forms, editors and interview questions

- Inputs MUST be 40–44px high on desktop and 44–48px on mobile. Default to `--control-height` (44px). Keep labels 4–8px from fields. Announce errors through a live region (or `role="alert"`); reserve no empty error row.
- Authentication modes MUST switch in place, retain the email, clear passwords and errors, and prevent duplicate submissions. Keep autofill enabled. The icon, input and visibility button MUST share one field surface. MUST NOT animate autofill background replacement.
- Document textareas MUST grow to fit the text, hide internal scrollbars and resize handles, and show a border or outline on focus only. Keep empty blocks compact. Collapse long reading content by default, with an explicit, keyboard-accessible expand action. Never truncate the stored text.
- Keep save status and word or character count in a fixed or sticky editor toolbar. Show saving, saved, unsaved and failed states. Preserve unsaved text on failure and warn before leaving. Focus mode MUST edit the same draft; test returning, saving and refreshing.
- Keep the self-introduction first, with freely named document sections after it. Review MUST use named topic groups containing distinct question-and-answer blocks. One question owns one answer and one stable ID; do not key answers by position or editable title.
- Examples of group names are Technical, Projects and Business. These are optional prompts. MUST NOT save placeholder answers as experience. Adding or renaming one question MUST preserve the answers to its siblings.
- Use headings, indentation and dividers for groups and questions. Collapsing either MUST preserve in-progress answers. Toggles MUST expose their expanded state and work with Enter and Space. Returning from focus mode MUST restore the same question and draft.
- Keep general and job-specific questions separate. A legacy plain-text note MUST remain readable and editable after opening and saving it.

## 7. Interaction and motion

- Interactive controls MUST have identifiable hover, focus-visible, active and disabled states. Gate hover rules with `@media (hover: hover)`; use native disabled semantics or enforce `aria-disabled` in handlers.
- Transitions MUST use 150–200ms and `ease-out`. Explicitly list only the properties that change: transform, box-shadow, opacity, color or background-color. MUST NOT use `transition: all`.
- For a gradient button, fade the opacity of an overlay. MUST NOT transition the gradient itself. Lift by at most 1px; other motion MUST stay within 3px and MUST NOT change layout.
- Honor `prefers-reduced-motion: reduce`. Remove nonessential motion while preserving visible state changes.

## 8. Secondary and destructive actions

- Show at most two persistent actions per row, counting the overflow trigger. Put other secondary actions in the overflow menu.
- Use `--danger` text or a light outline for deletion. Place delete last in menus, separated by a divider. MUST NOT style it as the regular primary action.
- Irreversible and bulk deletes MUST require a separate confirmation naming the records and attachments affected. Prefer an Undo action for a reversible single-item removal.

## 9. Mobile at 640px and below

- Use one column, 16px side gutters and zero page-level horizontal overflow. Stack labels above values. Wrap or ellipsize long values without expanding the viewport; keep full text accessible.
- Hit areas MUST be at least 44 by 44px. Input text MUST be at least 16px. Keep browser zoom enabled. Desktop hover-only actions MUST remain visible or reachable through a labeled menu.
- Menus and confirmations MUST use a bottom sheet or full-width dialog. Primary actions may fill the row. Use `dvh` and reserve `env(safe-area-inset-bottom)` at the bottom.
- In portrait, keep the registration fields, visible error and submit action reachable. In a short viewport or with the software keyboard open, allow the form or sheet to scroll. Focused fields, submit actions and close controls MUST remain reachable.

## 10. Color and token ownership

- All app-owned scroll containers MUST use the shared scrollbar theme for both axes: light-blue thumb, transparent track and 5px pointed ends where supported. Preserve native input, forced colors and auto-growing document fields. Do not override thumb styling per page.

- Load order comes from `src/styles/index.css`: base layout, shared theme tokens, then feature styles. Use `src/styles/theme/tokens.css` as the shared token source.
- Reuse `--blue` for action color, `--ink` and `--muted` for text, `--line` for dividers, `--paper` and `--surface` for backgrounds. Use the existing 4/8/12/16/20/24/32/40px spacing steps and 13/14/16px text tokens where applicable.
- New colors, spacing, radii and shadows MUST be named in the token file before use. MUST NOT hardcode them in components or use a spacing token as a radius. No shared shadow scale currently exists; introduce only the elevation needed for a specific overlay.

## Current state and items to correct

Source inventory of 78 authored border-radius declarations across the base and feature stylesheets in the current checkout, including feature and mobile overrides. Values below are observations, not additional allowed sizes. Paths are relative to this file. These findings are for later implementation.

| Family | Values found and locations |
| --- | --- |
| Cards and panels | `layout.css` (.card, .job-cover): 13px. `theme/auth.css` (.auth-card): 24px desktop, 20px on narrower screens, with 21/17px inner highlights. `theme/workspace.css` (.shot-panel, .job-section): 12px. `theme/materials-library.css` (.materials-container): 8px token. |
| Buttons | `layout.css`: .primary/.outline 8px, .icon-btn 7px, .text-btn and editor tools 5px, mode buttons 6px. `theme/workspace.css`: intake tabs 9px, screenshot drop button 10px, thumbnail 5px, delete 7px. `theme/auth.css`: tab buttons 9px, submit 8px token. |
| Inputs and selects | `layout.css`: search wrapper and form fields 7px. `theme/workspace.css`: job-form inputs/selects 7px. `theme/auth.css`: field wrapper 8px token, inner input 0. `theme/preparation.css`: title input 4px via a spacing token; focused textarea 8px. |
| Dialogs and menus | `layout.css` (.dialog): 13px. `theme/workspace.css` (job dialog): 18px desktop, 13px mobile. `theme/materials.css` (.document-preview): 14px, 0 on mobile. `theme/materials-library.css`: 8px menu. Mobile material and document menus use 16px top corners via a spacing token. |
| Tags and badges | `layout.css`: status, skill and cover labels 5px; count 6px; environment badge 20px. `theme/auth.css`: feature chips 20px. Status dots at 50% are decorative markers. |

- The materials table in `theme/materials-library.css` uses `--content-width-list` (68.75rem / 1100px) from `theme/tokens.css`, following the list-page bounds in section 3.
- `layout.css` (.main-content) permits 1510px; job content needs its own narrower bound. `../app/App.tsx` renders a heading accent and repeats the local-storage footer on the jobs page.
- `theme/workspace.css` adds a shadow to cards, swaps gradients on hover and puts bordered intake sections inside a bordered dialog. The screenshot delete control is 36px square.
- `theme/tokens.css` defines only the 8px control radius. The older authentication guidance specified 28–32px desktop and 20px mobile padding; use the padding limits in section 4 for future changes. Existing literals, the authentication card, and mobile sheets using spacing tokens need migration after radius approval.

## 11. Pre-commit checklist

- [ ] Check 1440px and 375px: no overflow, overlap, clipped actions or unexplained dead space.
- [ ] Check one page heading, a bounded content column and a primary action aligned to it.
- [ ] Check one container level, token-based card radii at or below 12px, and consistent inset corners.
- [ ] Check for duplicated explanations, local-space labels and footers.
- [ ] Exercise hover, keyboard focus, active, disabled and reduced-motion states. Check motion and contrast.
- [ ] Check 44px mobile targets, 16px input text, safe areas, software-keyboard reachability and non-hover access.
- [ ] Check the diff for new hardcoded colors, radii, shadows, spacing or other values that need tokens.
- [ ] For preparation changes, edit two questions in one group, collapse and reopen, switch focus view, save and reload. Verify both answers and an existing legacy note.
