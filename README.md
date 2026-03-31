# Employee Time Tracker

A simple web app for clocking in/out and viewing weekly hours.

## Setup

```bash
cd timetracker
npm install
node server.js
```

Then open **http://localhost:3000** in your browser.

## Pages

- **Clock In/Out** (`/`) — Select your name, clock in to start a shift, clock out and add a note when done.
- **Weekly Summary** (`/summary.html`) — View total hours per employee and a full shift log for the current week (Mon–Sun).

## Data

All time entries are stored in `data/timelog.json`. Each entry looks like:

```json
{
  "employee": "Madison Hein",
  "clockIn": "2025-01-13T09:00:00.000Z",
  "clockOut": "2025-01-13T17:30:00.000Z",
  "note": "Finished the client report",
  "date": "2025-01-13"
}
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/clockin` | Clock in `{ employee }` |
| POST | `/api/clockout` | Clock out `{ employee, note }` |
| GET | `/api/status/:name` | Check if employee is clocked in |
| GET | `/api/weekly-summary` | Hours summary for current week |
| GET | `/api/employees` | List of all employees |
