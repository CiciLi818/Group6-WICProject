const SymptomStore = (() => {
  const STORAGE_KEY = "symptomTracker.v1";

  const SYMPTOMS = [
    "headache", "fatigue", "nausea", "dizziness", "joint pain", "muscle pain",
    "stomach pain", "cough", "sore throat", "fever", "shortness of breath",
    "trouble sleeping", "anxiety", "other",
  ];

  const MAX_NOTES = 1000;

  const ok = (data) => ({ ok: true, data });
  const fail = (errors) => ({ ok: false, errors });

  // local date, not UTC
  const todayString = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  const isValidDate = (text) => {
    if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const [y, m, d] = text.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { nextId: 1, entries: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.entries)) throw new Error("bad shape");
      return parsed;
    } catch (e) {
      console.warn("SymptomStore: saved data unreadable, starting empty.", e);
      return { nextId: 1, entries: [] };
    }
  };

  const save = (db) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      console.error("SymptomStore: could not save.", e);
      return false;
    }
  };

  const SAVE_FAILED = { storage: "Couldn't save on this device. Storage may be full or blocked." };

  const copy = (entry) => ({ ...entry, symptoms: [...entry.symptoms] });

  const byDate = (a, b) => (a.entryDate < b.entryDate ? -1 : a.entryDate > b.entryDate ? 1 : 0);

  const validate = (input) => {
    const errors = {};
    const cleaned = {};
    input = input || {};

    if (!isValidDate(input.entryDate)) {
      errors.entryDate = "Pick a valid date.";
    } else if (input.entryDate > todayString()) {
      errors.entryDate = "You can't log a day in the future.";
    } else {
      cleaned.entryDate = input.entryDate;
    }

    const checkScore = (field, min, max, label) => {
      const value = Number(input[field]);
      if (input[field] === "" || input[field] === null || input[field] === undefined ||
          !Number.isInteger(value) || value < min || value > max) {
        errors[field] = `${label} must be a whole number from ${min} to ${max}.`;
      } else {
        cleaned[field] = value;
      }
    };
    checkScore("pain", 0, 10, "Pain");
    checkScore("mood", 1, 5, "Mood");
    checkScore("energy", 1, 5, "Energy");

    const list = input.symptoms === undefined ? [] : input.symptoms;
    if (!Array.isArray(list)) {
      errors.symptoms = "Symptoms must be a list.";
    } else {
      const clean = [];
      for (const s of list) {
        const name = String(s).trim().toLowerCase();
        if (!SYMPTOMS.includes(name)) {
          errors.symptoms = `"${s}" isn't one of the symptom options.`;
          break;
        }
        if (!clean.includes(name)) clean.push(name);
      }
      cleaned.symptoms = clean.sort();
    }

    if (input.notes === undefined || input.notes === null || String(input.notes).trim() === "") {
      cleaned.notes = null;
    } else if (String(input.notes).trim().length > MAX_NOTES) {
      errors.notes = `Notes can be at most ${MAX_NOTES} characters.`;
    } else {
      cleaned.notes = String(input.notes).trim();
    }

    return { cleaned, errors };
  };

  const hasErrors = (errors) => Object.keys(errors).length > 0;

  const inRange = (entries, range = {}) => {
    const { start, end } = range;
    return entries.filter((e) => (!start || e.entryDate >= start) && (!end || e.entryDate <= end));
  };

  const checkRange = (range = {}) => {
    const errors = {};
    if (range.start && !isValidDate(range.start)) errors.start = "Start date is invalid.";
    if (range.end && !isValidDate(range.end)) errors.end = "End date is invalid.";
    if (!hasErrors(errors) && range.start && range.end && range.start > range.end) {
      errors.range = "Start date must be on or before end date.";
    }
    return errors;
  };

  const createEntry = (input) => {
    const { cleaned, errors } = validate(input);
    if (hasErrors(errors)) return fail(errors);

    const db = load();
    if (db.entries.some((e) => e.entryDate === cleaned.entryDate)) {
      return fail({ entryDate: `You already logged ${cleaned.entryDate}. Edit that entry instead.` });
    }
    const now = new Date().toISOString();
    const entry = { id: db.nextId, ...cleaned, createdAt: now, updatedAt: now };
    db.entries.push(entry);
    db.nextId += 1;
    if (!save(db)) return fail(SAVE_FAILED);
    return ok(copy(entry));
  };

  const getEntry = (id) => {
    const found = load().entries.find((e) => e.id === Number(id));
    return found ? copy(found) : null;
  };

  const getEntryByDate = (date) => {
    const found = load().entries.find((e) => e.entryDate === date);
    return found ? copy(found) : null;
  };

  const listEntries = (range = {}) => {
    const errors = checkRange(range);
    if (hasErrors(errors)) return fail(errors);
    return ok(inRange(load().entries, range).sort(byDate).map(copy));
  };

  const listLoggedDates = (range = {}) => {
    const errors = checkRange(range);
    if (hasErrors(errors)) return fail(errors);
    return ok(inRange(load().entries, range).map((e) => e.entryDate).sort());
  };

  const updateEntry = (id, input) => {
    const db = load();
    const index = db.entries.findIndex((e) => e.id === Number(id));
    if (index === -1) return fail({ id: "That entry doesn't exist anymore." });

    const { cleaned, errors } = validate(input);
    if (hasErrors(errors)) return fail(errors);

    if (db.entries.some((e) => e.entryDate === cleaned.entryDate && e.id !== Number(id))) {
      return fail({ entryDate: `There's already an entry for ${cleaned.entryDate}.` });
    }
    const updated = { ...db.entries[index], ...cleaned, updatedAt: new Date().toISOString() };
    db.entries[index] = updated;
    if (!save(db)) return fail(SAVE_FAILED);
    return ok(copy(updated));
  };

  const deleteEntry = (id) => {
    const db = load();
    const before = db.entries.length;
    db.entries = db.entries.filter((e) => e.id !== Number(id));
    if (db.entries.length === before) return fail({ id: "That entry doesn't exist anymore." });
    if (!save(db)) return fail(SAVE_FAILED);
    return ok({ deletedId: Number(id) });
  };

  const deleteAllEntries = (confirm) => {
    if (confirm !== true) {
      return fail({ confirm: "Pass true to confirm deleting all data. This can't be undone." });
    }
    const count = load().entries.length;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      return fail(SAVE_FAILED);
    }
    return ok({ deletedCount: count });
  };

  const summarize = (values) => {
    if (values.length === 0) return { count: 0, average: null, minimum: null, maximum: null };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
      count: values.length,
      average: Math.round(avg * 100) / 100,
      minimum: Math.min(...values),
      maximum: Math.max(...values),
    };
  };

  const getPainTrend = (range = {}) => {
    const list = listEntries(range);
    if (!list.ok) return list;
    const points = list.data.map((e) => ({ date: e.entryDate, pain: e.pain }));
    return ok({
      labels: points.map((p) => p.date),
      values: points.map((p) => p.pain),
      points,
      summary: summarize(points.map((p) => p.pain)),
    });
  };

  const getMoodEnergy = (range = {}) => {
    const list = listEntries(range);
    if (!list.ok) return list;
    const points = list.data.map((e) => ({ date: e.entryDate, mood: e.mood, energy: e.energy }));
    return ok({
      labels: points.map((p) => p.date),
      mood: points.map((p) => p.mood),
      energy: points.map((p) => p.energy),
      points,
      moodSummary: summarize(points.map((p) => p.mood)),
      energySummary: summarize(points.map((p) => p.energy)),
    });
  };

  const getSymptomFrequency = (range = {}) => {
    const list = listEntries(range);
    if (!list.ok) return list;
    const total = list.data.length;
    const counts = {};
    for (const e of list.data) for (const s of e.symptoms) counts[s] = (counts[s] || 0) + 1;
    const symptoms = Object.entries(counts)
      .map(([symptom, days]) => ({
        symptom,
        days,
        percentOfDays: Math.round((days / total) * 1000) / 10,
      }))
      .sort((a, b) => b.days - a.days || a.symptom.localeCompare(b.symptom));
    return ok({
      totalDaysLogged: total,
      labels: symptoms.map((s) => s.symptom),
      values: symptoms.map((s) => s.days),
      symptoms,
    });
  };

  // prefix ' so excel doesn't treat notes as formulas
  const csvCell = (value) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    if (/[",\n\r]/.test(text)) text = '"' + text.replace(/"/g, '""') + '"';
    return text;
  };

  const exportCSV = (range = {}) => {
    const list = listEntries(range);
    if (!list.ok) return list;
    const rows = [["date", "pain", "mood", "energy", "symptoms", "notes"]];
    for (const e of list.data) {
      rows.push([e.entryDate, e.pain, e.mood, e.energy, e.symptoms.join("; "), e.notes]);
    }
    return ok(rows.map((r) => r.map(csvCell).join(",")).join("\r\n"));
  };

  const downloadCSV = (range = {}) => {
    const csv = exportCSV(range);
    if (!csv.ok) return csv;
    const blob = new Blob([csv.data], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "symptom_entries.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    return ok(true);
  };

  const seedDemoData = (days = 21) => {
    deleteAllEntries(true);
    const pick = ["headache", "fatigue", "nausea", "trouble sleeping", "joint pain"];
    const notes = [null, null, "Slept badly", "Busy day", "Went for a walk", null];
    let seed = 6;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = days; i >= 1; i--) {
      if (rand() < 0.15) continue;
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const pain = Math.max(0, Math.min(10, 6 + Math.round(3 * (rand() * 2 - 1)) - Math.floor((days - i) / 7)));
      createEntry({
        entryDate: date,
        pain,
        mood: Math.max(1, Math.min(5, 5 - Math.floor(pain / 3) + Math.round(rand() * 2 - 1))),
        energy: Math.max(1, Math.min(5, 4 - Math.floor(pain / 4) + Math.round(rand() * 2 - 1))),
        symptoms: pick.filter(() => rand() < 0.35),
        notes: notes[Math.floor(rand() * notes.length)],
      });
    }
    return ok({ count: load().entries.length });
  };

  return {
    SYMPTOMS: [...SYMPTOMS],
    MAX_NOTES,
    todayString,
    createEntry,
    getEntry,
    getEntryByDate,
    listEntries,
    listLoggedDates,
    updateEntry,
    deleteEntry,
    deleteAllEntries,
    getPainTrend,
    getMoodEnergy,
    getSymptomFrequency,
    exportCSV,
    downloadCSV,
    seedDemoData,
  };
})();
