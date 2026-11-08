# Screenshot intake specification

File selection and pasting inside the job dialog use the same local OCR flow. Recognition produces candidate values. Saving the reviewed job commits the source images and text to the account database.

| Given | When | Expected result |
| --- | --- | --- |
| An image with legible company or position text | Select a file or paste an image | Run OCR locally. Show the image, source text and editable candidates. Retain recognized values for review. |
| A partial image | Confirm the job | Save the original and recognized details. Leave missing fields empty and display them as unconfirmed. |
| A blurred image, empty text or unavailable OCR engine | Recognition finishes | Explain the outcome. Allow another image or saving the valid original. Never infer company, salary, remote policy or application progress. |
| Multiple selections or successive pastes | Confirm the batch | Fill only empty fields in list order. Save all originals and recognized text in one transaction. |
| An image removed during recognition | Its result arrives late | Ignore that result and keep other images. |
| Previously saved screenshots | Remove the first image, add images or remove them all | Saving removes the corresponding originals and OCR text. Canceling preserves them. Keep the job and confirmed fields. |
| A saved partial image | Add a complementary screenshot while editing | Fill missing fields and retain existing values. Each original remains available to inspect and download. |
| An unconfirmed or canceled form | Recognition finishes | Create no job or attachment. |

Support PNG and JPEG, up to 10 MB per image and 40 MB of new images per submission. Accept multi-select, drag-and-drop and repeated paste. Manual entry requires both company and position. Preserve raw OCR text and allow corrections to structured fields.

## Verification

Run `node --test tests/screenshot.test.mjs` for candidate extraction and merging. Browser acceptance uses `tests/screenshot_flow.py` with Python Playwright and Chromium. Set `WAYMARK_TEST_URL` to an isolated test container and optionally set `CHROME_BIN` to a local browser. The script uses fictional images and temporary accounts for real file selection, clipboard and OCR tests. Mocked responses exercise failure, retry and out-of-order results.
