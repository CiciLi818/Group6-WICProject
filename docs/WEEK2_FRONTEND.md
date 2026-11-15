# Week 2 frontend

Branch: `shohaani-week2-frontend`

## Run locally

Open this repository folder in VS Code. Use Live Server, or run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://localhost:8000. No npm installation or build is required.

## Included

- Login and registration UI with required fields, email validation, password confirmation, loading and error feedback.
- Demo session and logout control.
- Dashboard and navigation between Home, Check-in, Calendar, and Trends.
- Check-in create/update/delete using the unchanged `SymptomStore` API.
- Calendar and Trends placeholders, ready for the later screens.
- Shared responsive stylesheet, keyboard focus outlines, labels and live status messages.
- Direct entry pages: index.html, login.html, register.html, check-in.html, calendar.html, trends.html. These share app.js and auth.js; hash routes handle navigation within each page.

## Demo authentication — not production authentication

Login: demo@example.com / demo-only-123.

Registration validates the form and starts a demo session; it does NOT create an account. A registered sample email cannot subsequently be used to log in. Use the fixed demo credentials instead. Only the display name is saved to sessionStorage. Passwords and emails are not stored or transmitted.

The demo route guard is a UI demonstration, not access control. Existing health entries use one shared localStorage store. Logging out clears the demo session but does not delete entries. Use fake information only. Real accounts require a backend/authentication provider, per-user storage and server-side access checks before real health data can be used.

## Integration details

storage.js currently requires pain (0–10), mood (1–5), and energy (1–5), so this form does too. Period flow is not in the storage schema yet. Coordinate that field with the backend developer instead of silently discarding it. Symptom choices come from SymptomStore.SYMPTOMS.

## Checks

Passed: JavaScript parsing; all 34 existing storage tests in an isolated in-memory store; demo invalid-login rejection, valid login, registration session, logout, and no password persistence.
Browser verified: invalid-login message, login loading state, successful dashboard, and navigation to the check-in form. Full browser save/edit/delete, registration validation and mobile visual testing still need a manual pass; the browser session was interrupted during those checks.

Manual checklist:
1. Open login.html. Submit invalid demo credentials and check the error.
2. Log in with the provided demo credentials and view Home.
3. Open Check-in, enter sample scores and save. Reload and confirm they persist.
4. Change the scores and save again; confirm only one entry exists for that date.
5. Delete the sample entry after confirming; check the empty form.
6. Visit Calendar and Trends, then Home.
7. Log out and use browser Back; protected views should show Login.
8. Open Register. Check mismatched passwords, then submit matching sample values.
9. Test at 375 px and desktop widths, with keyboard navigation.

## Send your branch to GitHub

If working in the prepared Git checkout:

```sh
git status
git branch --show-current
git push -u origin shohaani-week2-frontend
```

If using the ZIP in another existing clone, create your branch first, then copy only the new frontend files and this guide into that clone. Do not overwrite newer teammate files from the ZIP.

```sh
git switch -c shohaani-week2-frontend
git add index.html login.html register.html check-in.html calendar.html trends.html css/styles.css js/app.js js/auth.js docs/WEEK2_FRONTEND.md
git commit -m "Add Week 2 frontend demo and navigation"
git push -u origin shohaani-week2-frontend
```

Open a pull request to main after pushing. Do not commit directly to main.
