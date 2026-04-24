// BP Yoga — Poplar Widget
// Scriptable.app — paste this into a new script

const LOCATION_ID = 1;        // 1 = Seattle Poplar
const LOCATION_NAME = 'Poplar';
const DAYS_AHEAD = 7;          // fetch next 7 days
const MAX_CLASSES = 5;         // how many to show in widget

// ── Date helpers ──────────────────────────────────────────
function toUTC(date) {
  return date.toISOString();
}

function localTime(utcString) {
  const d = new Date(utcString);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  });
}

function localDay(utcString) {
  const d = new Date(utcString);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  });
}

function isToday(utcString) {
  const d = new Date(utcString);
  const today = new Date();
  return (
    d.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }) ===
    today.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })
  );
}

// ── Fetch classes ─────────────────────────────────────────
async function fetchClasses() {
  const now = new Date();
  const end = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const url = 'https://widgets.api.prod.tilefive.com/cal'
    + '?startDT=' + encodeURIComponent(toUTC(now))
    + '&endDT=' + encodeURIComponent(toUTC(end))
    + '&locationId=' + LOCATION_ID
    + '&activityId=5'
    + '&page=1'
    + '&pageSize=50';
  const req = new Request(url);
  req.timeoutInterval = 10;
  req.headers = {
    'Authorization': 'boulderingproject',
    'X-Api-Key': 'YOUR_API_KEY_HERE',
    'Origin': 'https://boulderingproject.portal.approach.app',
    'Referer': 'https://boulderingproject.portal.approach.app/',
    'Accept': 'application/json, text/plain, */*',
  };

  try {
    const json = await req.loadJSON();
    const bookings = json.bookings || [];
    console.log('Total bookings from API: ' + bookings.length);
    console.log('URL used: ' + url);

    // Sort by start time, filter out classes that ended over an hour ago
    const filtered = bookings
      .filter((b) => new Date(b.endDT) > new Date(now.getTime() - 60 * 60 * 1000))
      .sort((a, b) => new Date(a.startDT) - new Date(b.startDT))
      .slice(0, MAX_CLASSES);
    console.log('After filter: ' + filtered.length);
    return filtered;
  } catch (e) {
    return null;
  }
}

// ── Colors ────────────────────────────────────────────────
const C = {
  bg:        new Color('#0f1117'),
  card:      new Color('#1a1d27'),
  accent:    new Color('#7eb8a4'),   // sage green
  accentDim: new Color('#3d6b5e'),
  text:      new Color('#f0ede8'),
  sub:       new Color('#8a8fa8'),
  warn:      new Color('#e08060'),
  divider:   new Color('#2a2d3a'),
};

// ── Build widget ──────────────────────────────────────────
async function buildWidget(classes) {
  const widget = new ListWidget();
  widget.backgroundColor = C.bg;
  widget.setPadding(14, 16, 14, 16);
  widget.url = 'https://boulderingproject.portal.approach.app/schedule?categoryIds=5';

  // Header
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const titleStack = header.addStack();
  titleStack.layoutVertically();

  const title = titleStack.addText('🧘 YOGA');
  title.font = Font.boldMonospacedSystemFont(11);
  title.textColor = C.accent;
  title.textOpacity = 0.9;

  const sub = titleStack.addText(LOCATION_NAME.toUpperCase());
  sub.font = Font.mediumMonospacedSystemFont(9);
  sub.textColor = C.sub;

  header.addSpacer();

  const now = new Date();
  const refreshed = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  });
  const refreshText = header.addText(refreshed);
  refreshText.font = Font.systemFont(9);
  refreshText.textColor = C.sub;

  widget.addSpacer(8);

  // Divider
  const div = widget.addStack();
  div.backgroundColor = C.divider;
  div.size = new Size(0, 1);
  widget.addSpacer(8);

  // No data
  if (!classes || classes.length === 0) {
    const empty = widget.addText('No upcoming classes found.');
    empty.font = Font.systemFont(12);
    empty.textColor = C.sub;
    return widget;
  }

  // Class rows
  let lastDay = null;

  for (const cls of classes) {
    const day = localDay(cls.startDT);
    const today = isToday(cls.startDT);

    // Day header if new day
    if (day !== lastDay) {
      if (lastDay !== null) widget.addSpacer(5);
      const dayLabel = widget.addText(today ? 'TODAY' : day.toUpperCase());
      dayLabel.font = Font.boldMonospacedSystemFont(8);
      dayLabel.textColor = today ? C.accent : C.sub;
      widget.addSpacer(3);
      lastDay = day;
    }

    // Class row
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.spacing = 6;

    // Time pill
    const timePill = row.addStack();
    timePill.backgroundColor = C.card;
    timePill.cornerRadius = 4;
    timePill.setPadding(2, 5, 2, 5);
    const timeText = timePill.addText(localTime(cls.startDT));
    timeText.font = Font.mediumMonospacedSystemFont(10);
    timeText.textColor = C.accent;

    // Class name
    const name = row.addText(cls.name);
    name.font = Font.mediumSystemFont(11);
    name.textColor = C.text;
    name.lineLimit = 1;
    row.addSpacer();

    // Spots remaining
    const spots = cls.ticketsRemaining;
    const total = cls.maxNumOfGuests;
    const pct = spots / total;
    const spotsColor = pct < 0.2 ? C.warn : pct < 0.5 ? C.accent : C.sub;
    const spotsText = row.addText(`${spots}`);
    spotsText.font = Font.mediumMonospacedSystemFont(10);
    spotsText.textColor = spotsColor;

    widget.addSpacer(4);
  }

  return widget;
}

// ── Run ───────────────────────────────────────────────────
const classes = await fetchClasses();
const widget = await buildWidget(classes);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // Preview in app
  widget.presentMedium();
}

Script.complete();
