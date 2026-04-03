# Important Items & Scrum of Scrums

Two new features for the 1-on-1 meetings app.

## Feature 1: Important Items

Any agenda item (active or discussed) can be marked as "Important". All important items are viewable in a dedicated page, not tied to a specific employee.

### Data Model

Add `is_important` BOOLEAN DEFAULT 0 to `agenda_items` table.

Entity `AgendaItem` gets:
- `isImportant: bool` (default false)
- getter/setter

### API

**Modified endpoint:**
- `PUT /api/agenda/{id}` — accepts `isImportant` (boolean) in request body alongside existing `content`, `isDiscussed`, `category`.

**New endpoint:**
- `GET /api/agenda/important` — returns all agenda items where `isImportant = true`, enriched with employee data. Sorted by `createdAt` DESC.

Response format:
```json
[
  {
    "id": 1,
    "content": "Review team performance",
    "category": "warning",
    "isDiscussed": true,
    "isImportant": true,
    "createdAt": "2026-04-01T10:00:00+00:00",
    "employeeId": 5,
    "employeeName": "Ivan Petrov"
  }
]
```

### Frontend

**AgendaList component** — add star icon to each item (both active and discussed). Click toggles `isImportant` via `PUT /api/agenda/{id}`. Filled star = important, outline star = normal.

**API client** — add `isImportant` to `AgendaItem` interface. Add `agendaApi.important()` function calling `GET /api/agenda/important`.

**ImportantPage (`/important`):**
- Header with title and "Back" button
- Flat list of important items, each showing:
  - Category color (left border, same as AgendaList)
  - Item text (strikethrough if discussed)
  - Employee name (clickable link to `/employees/:id`)
  - Creation date
  - Star icon to unmark as important
- Empty state: translated "No important items" message

**Navigation** — button on HomePage next to "Daily" button.

### Translations

New keys: `important`, `importantTitle`, `noImportantItems`, `importantBack`.

## Feature 2: Scrum of Scrums

A standalone section for weekly scrum-of-scrums meeting notes. Simple CRUD (no delete) for text entries with dates.

### Data Model

New table `scrum_notes`:
```sql
CREATE TABLE IF NOT EXISTS scrum_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    date DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

New Entity `ScrumNote`:
- `id`: int (PK, auto)
- `content`: text
- `date`: DateTime
- `createdAt`: DateTime
- `updatedAt`: DateTime

### API

New `ScrumController`:
- `GET /api/scrum-notes` — list all, sorted by `date` DESC
- `POST /api/scrum-notes` — `{ content, date? }` (date defaults to today)
- `PUT /api/scrum-notes/{id}` — `{ content?, date? }`

All endpoints require authentication (same `checkAuth` pattern as other controllers).

Response format:
```json
{
  "id": 1,
  "content": "Sprint going well, blocked on...",
  "date": "2026-04-03T00:00:00+00:00",
  "createdAt": "2026-04-03T10:00:00+00:00",
  "updatedAt": "2026-04-03T10:00:00+00:00"
}
```

### Frontend

**API client** — new `ScrumNote` interface and `scrumApi` object with `list`, `create`, `update` methods.

**ScrumPage (`/scrum`):**
- Header with title and "Back" button
- "New Entry" button expands a form: large textarea + date input (default today) + Save/Cancel
- List of entries (newest date first), each showing:
  - Date
  - Text content (whitespace-pre-wrap, can be large)
  - "Edit" button -> inline textarea with save
- Empty state: translated "No entries" message

**Navigation** — button on HomePage next to "Daily" and "Important" buttons.

### Translations

New keys: `scrum`, `scrumTitle`, `scrumNew`, `scrumDate`, `scrumContent`, `scrumContentPlaceholder`, `scrumNoEntries`, `scrumBack`, `scrumEdit`, `scrumSave`.

## Routing

New routes in `App.tsx`:
- `/important` -> `<ProtectedRoute><ImportantPage /></ProtectedRoute>`
- `/scrum` -> `<ProtectedRoute><ScrumPage /></ProtectedRoute>`

## Database Migration

In `backend/bin/init-db.php`:
1. Add `is_important` column migration to `agenda_items` (same pattern as existing migrations)
2. Add `CREATE TABLE IF NOT EXISTS scrum_notes` statement
