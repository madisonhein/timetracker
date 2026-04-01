const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'timelog.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const EMPLOYEES = [
  'Madison Hein', 'Eric White', 'Bode Rockwood', 'Cees',
  'Tj Tait', 'Aiden Swanson', 'Bart', 'Andy'
];

function readLog() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLog(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, 2=Tue, ...
  const diffToTuesday = day >= 2 ? 2 - day : 2 - day - 7;
  const tuesday = new Date(now);
  tuesday.setHours(0, 0, 0, 0);
  tuesday.setDate(now.getDate() + diffToTuesday);
  const monday = new Date(tuesday);
  monday.setDate(tuesday.getDate() + 6);
  monday.setHours(23, 59, 59, 999);
  return { monday: tuesday, sunday: monday };
}

// POST /api/clockin
app.post('/api/clockin', (req, res) => {
  const { employee } = req.body;
  if (!employee || !EMPLOYEES.includes(employee)) {
    return res.status(400).json({ error: 'Invalid employee name.' });
  }

  const log = readLog();
  const active = log.find(e => e.employee === employee && e.clockOut === null);
  if (active) {
    return res.status(409).json({ error: `${employee} is already clocked in.`, entry: active });
  }

  const now = new Date();
  const entry = {
    employee,
    clockIn: now.toISOString(),
    clockOut: null,
    note: '',
    date: now.toISOString().slice(0, 10)
  };
  log.push(entry);
  writeLog(log);
  res.json({ message: `${employee} clocked in successfully.`, entry });
});

// POST /api/clockout
app.post('/api/clockout', (req, res) => {
  const { employee, note } = req.body;
  if (!employee || !EMPLOYEES.includes(employee)) {
    return res.status(400).json({ error: 'Invalid employee name.' });
  }

  const log = readLog();
  const idx = log.findIndex(e => e.employee === employee && e.clockOut === null);
  if (idx === -1) {
    return res.status(404).json({ error: `${employee} is not currently clocked in.` });
  }

  log[idx].clockOut = new Date().toISOString();
  log[idx].note = (note || '').trim();
  writeLog(log);
  res.json({ message: `${employee} clocked out successfully.`, entry: log[idx] });
});

// GET /api/status/:name
app.get('/api/status/:name', (req, res) => {
  const employee = decodeURIComponent(req.params.name);
  if (!EMPLOYEES.includes(employee)) {
    return res.status(400).json({ error: 'Invalid employee name.' });
  }
  const log = readLog();
  const active = log.find(e => e.employee === employee && e.clockOut === null) || null;
  res.json({ employee, active });
});

// GET /api/weekly-summary
app.get('/api/weekly-summary', (req, res) => {
  const log = readLog();
  const { monday, sunday } = getWeekBounds();

  const summary = {};
  for (const emp of EMPLOYEES) {
    summary[emp] = { totalMinutes: 0, shifts: [] };
  }

  for (const entry of log) {
    if (!EMPLOYEES.includes(entry.employee)) continue;
    const clockIn = new Date(entry.clockIn);
    if (clockIn < monday || clockIn > sunday) continue;

    const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
    const minutes = clockOut ? Math.round((clockOut - clockIn) / 60000) : null;

    summary[entry.employee].shifts.push({
      clockIn: entry.clockIn,
      clockOut: entry.clockOut,
      note: entry.note,
      date: entry.date,
      minutes
    });

    if (minutes !== null) {
      summary[entry.employee].totalMinutes += minutes;
    }
  }

  res.json({
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
    summary
  });
});

// POST /api/manual-entry
app.post('/api/manual-entry', (req, res) => {
  const { employee, date, clockIn: clockInTime, clockOut: clockOutTime, note } = req.body;

  if (!employee || !EMPLOYEES.includes(employee)) {
    return res.status(400).json({ error: 'Invalid employee name.' });
  }
  if (!date || !clockInTime || !clockOutTime) {
    return res.status(400).json({ error: 'Date, clock-in time, and clock-out time are required.' });
  }

  const clockInISO = new Date(`${date}T${clockInTime}`).toISOString();
  const clockOutISO = new Date(`${date}T${clockOutTime}`).toISOString();

  if (new Date(clockOutISO) <= new Date(clockInISO)) {
    return res.status(400).json({ error: 'Clock-out time must be after clock-in time.' });
  }

  const entry = {
    employee,
    clockIn: clockInISO,
    clockOut: clockOutISO,
    note: (note || '').trim(),
    date
  };

  const log = readLog();
  log.push(entry);
  writeLog(log);
  res.json({ message: 'Entry saved successfully.', entry });
});

// GET /api/employees
app.get('/api/employees', (req, res) => {
  res.json(EMPLOYEES);
});

app.listen(PORT, () => {
  console.log(`Time tracker running at http://localhost:${PORT}`);
});
