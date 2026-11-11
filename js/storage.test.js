const runStorageTests = () => {
  const S = SymptomStore;
  const KEY = "symptomTracker.v1";
  const results = [];

  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const equal = (actual, expected, label) => {
    const a = JSON.stringify(actual), b = JSON.stringify(expected);
    if (a !== b) throw new Error(`${label}: expected ${b}, got ${a}`);
  };

  const test = (name, fn) => {
    S.deleteAllEntries(true);
    try { fn(); results.push({ name, pass: true }); }
    catch (e) { results.push({ name, pass: false, error: e.message }); }
  };

  const entry = (overrides = {}) => ({
    entryDate: "2026-11-01", pain: 4, mood: 3, energy: 3,
    symptoms: ["headache", "fatigue"], notes: "Slept badly", ...overrides,
  });

  const daysFromToday = (n) => {
    const d = new Date(); d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // don't wipe real data while testing
  const backup = localStorage.getItem(KEY);

  test("create an entry and read it back", () => {
    const r = S.createEntry(entry());
    assert(r.ok, "create should succeed");
    equal(r.data.id, 1, "id");
    equal(r.data.symptoms, ["fatigue", "headache"], "symptoms sorted");
    equal(S.getEntry(1).notes, "Slept badly", "notes");
  });

  test("entry is still there after 'reopening' (saved in localStorage)", () => {
    S.createEntry(entry());
    const raw = JSON.parse(localStorage.getItem(KEY));
    equal(raw.entries.length, 1, "stored entries");
  });

  test("get entry by date", () => {
    S.createEntry(entry({ entryDate: "2026-11-03" }));
    assert(S.getEntryByDate("2026-11-03") !== null, "found");
    equal(S.getEntryByDate("2026-11-04"), null, "missing day");
  });

  test("only one entry per day", () => {
    S.createEntry(entry());
    const r = S.createEntry(entry());
    assert(!r.ok && r.errors.entryDate, "second entry same day should fail");
  });

  test("list is oldest-first and filterable", () => {
    ["2026-11-05", "2026-11-01", "2026-11-03"].forEach((d) => S.createEntry(entry({ entryDate: d })));
    equal(S.listEntries().data.map((e) => e.entryDate), ["2026-11-01", "2026-11-03", "2026-11-05"], "order");
    equal(S.listEntries({ start: "2026-11-02", end: "2026-11-04" }).data.length, 1, "filtered");
  });

  test("backwards date range is rejected", () => {
    assert(!S.listEntries({ start: "2026-11-10", end: "2026-11-01" }).ok, "should fail");
  });

  test("logged dates for the calendar", () => {
    ["2026-10-30", "2026-11-01", "2026-11-02"].forEach((d) => S.createEntry(entry({ entryDate: d })));
    equal(S.listLoggedDates({ start: "2026-11-01", end: "2026-11-30" }).data, ["2026-11-01", "2026-11-02"], "dates");
  });

  test("missing entry returns null", () => {
    equal(S.getEntry(999), null, "missing");
  });

  test("changing a returned entry doesn't change saved data", () => {
    const r = S.createEntry(entry());
    r.data.pain = 10;
    r.data.symptoms.push("fever");
    equal(S.getEntry(1).pain, 4, "pain");
    equal(S.getEntry(1).symptoms.length, 2, "symptoms");
  });

  test("pain must be 0-10", () => {
    assert(!S.createEntry(entry({ pain: 11 })).ok, "11");
    assert(!S.createEntry(entry({ pain: -1 })).ok, "-1");
    assert(!S.createEntry(entry({ pain: 4.5 })).ok, "4.5");
    assert(S.createEntry(entry({ pain: 0 })).ok, "0 is allowed");
  });

  test("mood and energy must be 1-5", () => {
    assert(!S.createEntry(entry({ mood: 0 })).ok, "mood 0");
    assert(!S.createEntry(entry({ energy: 6 })).ok, "energy 6");
  });

  test("numbers typed into a form as text are accepted", () => {
    const r = S.createEntry(entry({ pain: "7", mood: "2", energy: "4" }));
    assert(r.ok, "should accept");
    equal(r.data.pain, 7, "converted to number");
  });

  test("missing pain is rejected with a message", () => {
    const e = entry(); delete e.pain;
    const r = S.createEntry(e);
    assert(!r.ok && r.errors.pain.includes("Pain"), "error message");
  });

  test("future dates are rejected, today is fine", () => {
    assert(!S.createEntry(entry({ entryDate: daysFromToday(1) })).ok, "tomorrow");
    assert(S.createEntry(entry({ entryDate: daysFromToday(0) })).ok, "today");
  });

  test("fake dates are rejected", () => {
    assert(!S.createEntry(entry({ entryDate: "2026-02-30" })).ok, "Feb 30");
    assert(!S.createEntry(entry({ entryDate: "11/01/2026" })).ok, "wrong format");
  });

  test("unknown symptom is rejected", () => {
    assert(!S.createEntry(entry({ symptoms: ["zombie bite"] })).ok, "should fail");
  });

  test("symptoms are cleaned up", () => {
    equal(S.createEntry(entry({ symptoms: [" Headache", "headache", "NAUSEA"] })).data.symptoms,
      ["headache", "nausea"], "cleaned");
  });

  test("notes: too long rejected, blank becomes null", () => {
    assert(!S.createEntry(entry({ notes: "x".repeat(1001) })).ok, "too long");
    equal(S.createEntry(entry({ notes: "   " })).data.notes, null, "blank");
  });

  test("broken saved data doesn't crash the site", () => {
    localStorage.setItem(KEY, "{not valid json");
    equal(S.listEntries().data, [], "starts empty");
    assert(S.createEntry(entry()).ok, "can still save");
  });

  test("update an entry", () => {
    S.createEntry(entry());
    const r = S.updateEntry(1, entry({ pain: 8, symptoms: ["nausea"] }));
    assert(r.ok, "update ok");
    equal(r.data.pain, 8, "pain");
    equal(r.data.symptoms, ["nausea"], "symptoms");
    assert(r.data.updatedAt >= r.data.createdAt, "timestamp");
  });

  test("updating a missing entry fails", () => {
    assert(!S.updateEntry(999, entry()).ok, "should fail");
  });

  test("can't move an entry onto another day's date", () => {
    S.createEntry(entry({ entryDate: "2026-11-01" }));
    S.createEntry(entry({ entryDate: "2026-11-02" }));
    assert(!S.updateEntry(2, entry({ entryDate: "2026-11-01" })).ok, "should fail");
    equal(S.getEntry(2).entryDate, "2026-11-02", "unchanged");
  });

  test("invalid update is rejected and changes nothing", () => {
    S.createEntry(entry());
    assert(!S.updateEntry(1, entry({ pain: 99 })).ok, "should fail");
    equal(S.getEntry(1).pain, 4, "unchanged");
  });

  test("delete one entry", () => {
    S.createEntry(entry());
    assert(S.deleteEntry(1).ok, "delete ok");
    equal(S.getEntry(1), null, "gone");
    assert(!S.deleteEntry(1).ok, "second delete fails");
  });

  test("delete-all needs true", () => {
    S.createEntry(entry());
    assert(!S.deleteAllEntries().ok, "no confirm");
    assert(!S.deleteAllEntries("yes").ok, "string isn't true");
    equal(S.listEntries().data.length, 1, "still there");
  });

  test("delete-all wipes everything and ids start over", () => {
    S.createEntry(entry({ entryDate: "2026-11-01" }));
    S.createEntry(entry({ entryDate: "2026-11-02" }));
    equal(S.deleteAllEntries(true).data, { deletedCount: 2 }, "count");
    equal(localStorage.getItem(KEY), null, "storage key removed");
    equal(S.createEntry(entry()).data.id, 1, "id restarts");
  });

  const seed3 = () => {
    S.createEntry(entry({ entryDate: "2026-11-01", pain: 2, mood: 4, energy: 4, symptoms: ["headache"] }));
    S.createEntry(entry({ entryDate: "2026-11-02", pain: 6, mood: 2, energy: 2, symptoms: ["headache", "nausea"] }));
    S.createEntry(entry({ entryDate: "2026-11-03", pain: 4, mood: 3, energy: 3, symptoms: [] }));
  };

  test("pain trend", () => {
    seed3();
    const d = S.getPainTrend().data;
    equal(d.values, [2, 6, 4], "values");
    equal(d.labels, ["2026-11-01", "2026-11-02", "2026-11-03"], "labels");
    equal(d.summary, { count: 3, average: 4, minimum: 2, maximum: 6 }, "summary");
  });

  test("pain trend with date filter", () => {
    seed3();
    equal(S.getPainTrend({ start: "2026-11-02" }).data.values, [6, 4], "filtered");
  });

  test("empty charts don't crash", () => {
    equal(S.getPainTrend().data.summary.average, null, "pain");
    equal(S.getMoodEnergy().data.points, [], "mood");
    equal(S.getSymptomFrequency().data.totalDaysLogged, 0, "symptoms");
  });

  test("mood + energy", () => {
    seed3();
    const d = S.getMoodEnergy().data;
    equal(d.mood, [4, 2, 3], "mood");
    equal(d.energy, [4, 2, 3], "energy");
    equal(d.moodSummary.average, 3, "average");
  });

  test("symptom frequency", () => {
    seed3();
    const d = S.getSymptomFrequency().data;
    equal(d.totalDaysLogged, 3, "total");
    equal(d.symptoms[0], { symptom: "headache", days: 2, percentOfDays: 66.7 }, "headache");
    equal(d.labels, ["headache", "nausea"], "labels");
  });

  test("CSV export", () => {
    seed3();
    const lines = S.exportCSV().data.split("\r\n");
    equal(lines[0], "date,pain,mood,energy,symptoms,notes", "header");
    equal(lines.length, 4, "rows");
    equal(lines[2], "2026-11-02,6,2,2,headache; nausea,Slept badly", "row 2");
  });

  test("CSV handles commas/quotes and blocks formulas", () => {
    S.createEntry(entry({ notes: '=HYPERLINK("x")' }));
    S.createEntry(entry({ entryDate: "2026-11-02", notes: 'tired, "achy"' }));
    const lines = S.exportCSV().data.split("\r\n");
    assert(lines[1].endsWith(`"'=HYPERLINK(""x"")"`), "formula neutralized: " + lines[1]);
    assert(lines[2].endsWith(`"tired, ""achy"""`), "quoted: " + lines[2]);
  });

  test("demo data loads", () => {
    const r = S.seedDemoData();
    assert(r.ok && r.data.count > 10, "seeded " + (r.data && r.data.count));
  });

  if (backup === null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, backup);

  return results;
};
