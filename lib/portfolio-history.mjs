const dateKey = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function isDailyValue(date, value) {
  return dateKey.test(date) && Number.isFinite(value) && value >= 0;
}

function toKoreaDay(value) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(value));
}

function startDay(day, amount) {
  const [year, month, date] = day.split("-").map(Number);
  const current = new Date(Date.UTC(year, month - 1, date));
  current.setUTCDate(current.getUTCDate() - amount);
  return current.toISOString().slice(0, 10);
}

function dayLabel(day) {
  const [, month, date] = day.split("-");
  return `${Number(month)}/${Number(date)}`;
}

function snapshotLabel(capturedAt) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(capturedAt));
}

function parseDaily(value) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([date, amount]) => isDailyValue(date, amount)));
}

function parseSnapshots(value) {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  return value.filter((snapshot) => {
    if (!isRecord(snapshot) || typeof snapshot.id !== "string" || typeof snapshot.capturedAt !== "string" || !Number.isFinite(snapshot.value) || snapshot.value < 0) return false;
    if (Number.isNaN(new Date(snapshot.capturedAt).valueOf()) || ids.has(snapshot.id)) return false;
    ids.add(snapshot.id);
    return true;
  }).map((snapshot) => ({ id: snapshot.id, capturedAt: snapshot.capturedAt, value: snapshot.value }));
}

export function parsePortfolioHistory(value) {
  if (!isRecord(value)) return { daily: {}, snapshots: [] };
  const current = isRecord(value.daily);
  return {
    daily: parseDaily(current ? value.daily : value),
    snapshots: parseSnapshots(current ? value.snapshots : []),
  };
}

export function upsertDailyValue(history, day, value) {
  return { ...history, daily: { ...history.daily, [day]: value } };
}

export function captureSnapshot(history, capturedAt, value, id) {
  return { ...history, snapshots: [...history.snapshots, { id, capturedAt, value }] };
}

export function selectTimeline(history, range, today) {
  const lowerBound = range === "7d" ? startDay(today, 6) : today;
  const daily = Object.entries(history.daily)
    .filter(([day]) => range === "all" || day >= lowerBound)
    .map(([day, value]) => ({ id: `daily-${day}`, label: dayLabel(day), value, order: new Date(`${day}T00:00:00+09:00`).toISOString() }));
  const snapshots = history.snapshots
    .filter((snapshot) => range === "all" || toKoreaDay(snapshot.capturedAt) >= lowerBound)
    .map((snapshot) => ({ id: snapshot.id, label: snapshotLabel(snapshot.capturedAt), value: snapshot.value, order: snapshot.capturedAt }));
  return [...daily, ...snapshots].sort((left, right) => left.order.localeCompare(right.order)).map(({ id, label, value }) => ({ id, label, value }));
}
