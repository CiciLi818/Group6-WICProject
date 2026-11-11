# Storage API

All saving and loading goes through **`js/storage.js`**. It stores entries in the browser (localStorage), so it works on GitHub Pages with no server.

## Setup

In `index.html`, load it **before** your own script:

```html
<script src="js/storage.js"></script>
<script src="js/index.js"></script>
```

Then call `SymptomStore.<function>()` from anywhere in your JS.

## The one rule: check `ok`

Anything that saves, or that takes a date range, returns one of these:

```js
{ ok: true,  data: ... }                                   // worked
{ ok: false, errors: { pain: "Pain must be a whole number from 0 to 10." } }  // didn't
```

`errors` is keyed by field name (`entryDate`, `pain`, `mood`, `energy`, `symptoms`, `notes`), so you can put each message under the matching input. Messages are written to show directly to users.

```js
const result = SymptomStore.createEntry({
  entryDate: document.querySelector("#date").value,   // "2026-11-11"
  pain: document.querySelector("#pain").value,        // "4" is fine, it gets converted
  mood: document.querySelector("#mood").value,
  energy: document.querySelector("#energy").value,
  symptoms: [...document.querySelectorAll("input[name=symptom]:checked")].map((c) => c.value),
  notes: document.querySelector("#notes").value,
});

if (result.ok) {
  // saved! result.data is the saved entry
} else {
  // e.g. result.errors.pain -> show it under the pain slider
}
```

## Entry object

| Field | Type | Rule |
|---|---|---|
| `id` | number | set automatically |
| `entryDate` | `"YYYY-MM-DD"` | required, real date, not in the future, **one entry per day** |
| `pain` | number | required, whole number 0–10 |
| `mood` | number | required, whole number 1–5 |
| `energy` | number | required, whole number 1–5 |
| `symptoms` | array of strings | optional; each must be in `SymptomStore.SYMPTOMS`; returned sorted A–Z |
| `notes` | string or `null` | optional, max 1000 characters; blank becomes `null` |
| `createdAt`, `updatedAt` | ISO timestamp | set automatically |

## Functions

| Function | Returns | Use it for |
|---|---|---|
| `SYMPTOMS` | array | build the symptom checkboxes from this |
| `todayString()` | `"2026-11-11"` | default value for the date input |
| `createEntry(entry)` | `{ok, data: entry}` | check-in form "Save" |
| `getEntry(id)` | entry or `null` | detail view |
| `getEntryByDate("2026-11-11")` | entry or `null` | clicking a calendar day |
| `listEntries({start, end})` | `{ok, data: [entries]}` oldest first | history list (range is optional) |
| `listLoggedDates({start, end})` | `{ok, data: ["2026-11-01", ...]}` | dots on the calendar |
| `updateEntry(id, entry)` | `{ok, data: entry}` | edit form "Save". **Send every field**, not just the changed ones |
| `deleteEntry(id)` | `{ok, data: {deletedId}}` | delete button (show a confirm first) |
| `deleteAllEntries(true)` | `{ok, data: {deletedCount}}` | "Delete all my data". Must pass `true` |
| `getPainTrend({start, end})` | see below | pain line chart |
| `getMoodEnergy({start, end})` | see below | mood/energy chart |
| `getSymptomFrequency({start, end})` | see below | symptom bar chart |
| `exportCSV({start, end})` | `{ok, data: "csv text"}` | |
| `downloadCSV({start, end})` | downloads a file | "Export" button |
| `seedDemoData()` | fills ~3 weeks of fake data | **replaces all data**, for testing and the demo |

## Chart data (Week 4)

`labels` / `values` drop straight into Chart.js (or any chart library):

```js
const pain = SymptomStore.getPainTrend().data;
// { labels: ["2026-11-01", "2026-11-02"], values: [2, 6],
//   points: [{date, pain}, ...],
//   summary: { count: 2, average: 4, minimum: 2, maximum: 6 } }

new Chart(canvas, { type: "line", data: { labels: pain.labels, datasets: [{ label: "Pain", data: pain.values }] } });

// accessible text summary for screen readers:
`Average pain over ${pain.summary.count} days was ${pain.summary.average} out of 10.`
```

```js
SymptomStore.getMoodEnergy().data
// { labels, mood: [4, 2], energy: [4, 2], points, moodSummary, energySummary }

SymptomStore.getSymptomFrequency().data
// { totalDaysLogged: 3, labels: ["headache", "nausea"], values: [2, 1],
//   symptoms: [{ symptom: "headache", days: 2, percentOfDays: 66.7 }, ...] }
```

**Empty state:** with no entries, arrays are `[]` and `average`/`minimum`/`maximum` are `null`. Check `summary.count === 0` and show "No entries yet."

## Privacy notes (for the privacy page / known limitations)

- Everything is stored only in this browser on this device. Nothing is sent to us or anyone else.
- Clearing browser data or using a different browser/device means the entries won't be there.
- Anyone using the same browser profile can see the entries (no login in the MVP).
- "Delete all" fully removes the stored data.
- CSV export blocks spreadsheet formula injection.
- Not a medical device. Show the disclaimer.
