# Charts implementation and GitHub guide

## Delivered

- Pain-over-time SVG chart with a fixed 0–10 scale and actual date spacing.
- Symptom-frequency bars showing days reported out of logged days.
- Inclusive From/Through filtering, This month and All dates.
- Empty, one-entry, no-selected-symptom and invalid-range states.
- Neutral summaries and a readable data table.
- Sample-data toggle that does not save or replace records.
- Responsive controls and horizontally scrollable pain chart on narrow screens.
- Ten calculation tests in charts-tests.html.

No npm packages, CDN scripts, new authentication, or storage schema changes.
The charts read SymptomStore.listEntries and calculate both views from the same filtered records. Missing days are not zeros; lines only connect consecutive logged days. No cause or diagnosis is inferred. Symptom counts are days, not individual symptom episodes. Existing demo authentication and browser-shared storage limitations remain. The existing store treats unreadable saved data as empty; charts cannot distinguish that condition without a storage API change.

## Get the prepared branch (recommended)

Save charts-branch.bundle from the chat into Downloads. This is a Git file containing the prepared branch and its history, not a ZIP. Do not unzip it.

If you do not already have a clone:

```sh
cd ~/Documents
git clone https://github.com/CiciLi818/Group6-WICProject.git
```

For an existing or new clone:

```sh
cd ~/Documents/Group6-WICProject
git status
```

If there are uncommitted changes, commit them on their existing branch before continuing. Do not reset or discard them.

```sh
git fetch origin
git fetch ~/Downloads/charts-branch.bundle shohaani-charts:shohaani-charts
git switch shohaani-charts
git log --oneline -3
```

The new branch is already committed. There is no need to copy files, git add, or commit again. If the destination branch already exists, do not force it: use a new name in the fetch destination, such as shohaani-charts-review, and switch to that name.

## Run and test

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://localhost:8000. Log in with demo@example.com / demo-only-123. Open Trends.

1. With no saved entries, verify the empty messages.
2. Select View sample data, then All dates. Expect seven days, pain average 2.7, range 0–6, fatigue 5/7 and headache 4/7.
3. Select today's date for both From and Through and Apply dates. Sample mode should show one entry and no pain line; no symptoms are selected for that entry.
4. Enter an end date before the start. Expect an error and no stale charts.
5. Select All dates to recover.
6. Toggle View my entries. Sample data must disappear without changing saved records.
7. Add sample check-ins on two past dates using Check-in. Return to Trends, select All dates, and confirm the records appear. Edit one and revisit Trends to confirm the change.
8. Open View chart data as a table and compare dates, scores and symptoms.
9. At 375 px wide, check the controls, bar labels and navigation; scroll inside the pain chart to see its full width.
10. Open http://localhost:8000/charts-tests.html. Expect 10 / 10 passed. These tests never access localStorage.

Press Control+C in Terminal to stop the server.

Verified during development: ten calculation tests, syntax checks, existing 34 storage tests in isolated memory, browser empty and sample states, reversed-range error, single-entry state, filter reset, and 375 px page width without page-level overflow. Manual end-to-end edits through Check-in are not part of this chart validation pass.

## Push and open a pull request

```sh
git push -u origin shohaani-charts
```

Open https://github.com/CiciLi818/Group6-WICProject/pulls and choose New pull request.

At preparation time main did not contain the Week 2 frontend. This chart branch is based on origin/shohaani-week2-frontend, commit 23c62c3. To review only the charts, choose base shohaani-week2-frontend and compare shohaani-charts. After the Week 2 PR is merged, the team can retarget this PR to main. If Week 2 has already merged normally into main, choose main as the base. If it was squash-merged or conflicts appear, ask the Git manager to reconcile the base; do not force-push or replace teammates' changes.

Title: Add pain and symptom charts with date filtering

Description:

```markdown
## Summary
- Replace the Trends placeholder with pain-over-time and symptom-frequency charts.
- Add inclusive date filters, This month and All dates controls.
- Handle empty, single-entry and no-symptom states.
- Add neutral summaries and an accessible data table.
- Include sample data without changing saved entries.
- Preserve the existing storage API and demo authentication.

## Validation
- 10 chart calculation tests passed.
- 34 existing storage tests passed in isolated memory.
- Browser checks passed for empty/sample states, invalid ranges, single-entry results and filter reset.
- Checked the 375 px mobile layout; the pain plot scrolls inside its container.

## Review notes
Based on the Week 2 frontend branch. Calendar remains a placeholder.
No diagnosis, predictions or causal claims are made.
```

## ZIP alternative

Group6-WICProject-charts.zip contains the full project for inspection or standalone testing. It has no .git history. Prefer the Git bundle to bring the work into your existing clone safely, instead of overwriting teammate files with the ZIP.
