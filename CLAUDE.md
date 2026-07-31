# 1-on-1 Meetings Application

Web-приложение для тимлида: 1-1 встречи с командой. Сотрудники с досье, повестка
(категории, drag & drop), экран живой встречи с таймером и оценкой настроения,
история, командные заметки, синхронизация с календарём Битрикс24.
UI — по дизайн-системе Битрикс24 (см. `docs/plans/redesign-2026-07.md`), русскоязычный.

## Быстрый старт

```bash
# ВАЖНО: запускать только из этой директории (/Volumes/projects/pet/1on1) —
# bind mount ./data фиксируется при создании контейнера; запуск из другого пути
# приводит к «пропаже» данных (см. память ассистента: 1on1-docker-mount-path)
docker-compose up --build

# http://localhost:3000  /  http://1on1.bx:3000 (нужна запись в /etc/hosts)
```

При первом запуске приложение попросит задать пароль (минимум 12 символов).

### Демо режим

```bash
./setup-demo.sh          # Создать и переключиться на демо-базу
./switch-to-demo.sh      # Переключиться на демо (если уже создана)
./switch-to-prod.sh      # Вернуться на продовскую базу
```

Демо: пароль `demo12345678`. При первом `setup-demo.sh` продовская база копируется в `app.prod.db`.

## Стек

- **Backend**: Symfony 7 (PHP 8.3) + Doctrine ORM + SQLite
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (токены в `tailwind.config.js`, keyframes в `index.css`)
- **Инфра**: Docker + docker-compose, Redis 7 (rate limiting)
- **Битрикс24**: вебхук `BITRIX24_WEBHOOK_URL` в `.env` (скоупы user + calendar)

## Структура

```
├── docker-compose.yml / .env        # APP_SECRET, JWT_SECRET, USE_DEMO_DB, BITRIX24_WEBHOOK_URL
├── data/                            # SQLite (volume), backups/ + backup.sh / restore.sh
├── docs/plans/redesign-2026-07.md   # дизайн-токены и решения редизайна
├── backend/
│   ├── bin/init-db.php              # схема + все миграции (идемпотентные ALTER)
│   ├── bin/init-demo-db.php         # демо-данные
│   └── src/
│       ├── Controller/              # Auth, Employee, Meeting, Agenda, Scrum, BitrixCalendar
│       ├── Entity/                  # Settings, Employee, Meeting, AgendaItem, ScrumNote
│       ├── Repository/
│       └── Service/                 # AuthService (JWT), RateLimiter (Redis),
│                                    # BitrixService (user.get, calendar.event.get),
│                                    # CalendarSyncService (матчинг «1-1 (Имя)» → сотрудник)
└── frontend/src/
    ├── App.tsx                      # роутинг, AuthContext, ToastProvider, Splash
    ├── api/client.ts                # axios + типы + все API-функции
    ├── ui/index.tsx                 # Avatar, Pill, Button, Card, Modal, Toggle, SpecCheckbox,
    │                                # Skeleton, urgency()/dueDays(), форматирование дат RU
    ├── ui/toast.tsx                 # useToast()
    ├── layout/AppShell.tsx          # сайдбар + useShell() (employees/meetings/scrumNotes) + скелетон 480мс
    ├── components/                  # AgendaList (днд/категории), AuthLayout, ClockWidget, Splash
    └── pages/                       # Home (Команда), Employee (карточка), Meeting (встреча с таймером),
                                     # History, Scrum (команд. заметки), Daily, Important, Login, Setup
```

## Модель данных

- **Settings**: id=1, passwordHash (NULL → нужен setup)
- **Employee**: name, nameInstr (творительный падеж для «1-1 с Анной»), position, bio,
  bitrixId, avatarUrl, calendarEventId, meetingRule («Раз в 2 недели по вторникам, 14:30 — 30 минут»),
  nextMeetingAt — последние три заполняет календарный синк
- **Meeting**: employee, date, notes, discussedTopics (JSON), mood (1–5, NULL у старых),
  duration (минуты, NULL у старых)
- **AgendaItem**: employee, content, isDiscussed, isImportant, category (note|positive|warning|problem), sortOrder
- **ScrumNote**: content, date, tab (sos|topics|decisions), people (JSON id сотрудников)

## API (все, кроме /auth, требуют JWT-cookie)

```
GET/POST /api/auth/{check|setup|login|logout}

GET/POST   /api/employees                 PUT/DELETE /api/employees/{id}
GET        /api/employees/bitrix-status   GET /api/employees/bitrix-preview/{bitrixId}
POST       /api/bitrix/sync-calendar      # ищет в календаре серии «1-1 (Имя)», матчит по
                                          # уменьшительным именам + инициалу фамилии,
                                          # пишет meetingRule/nextMeetingAt, возвращает журнал

GET/POST   /api/employees/{id}/agenda     PUT/DELETE /api/agenda/{id}
PUT        /api/employees/{id}/agenda/reorder   GET /api/agenda/important

GET/POST   /api/employees/{id}/meetings   GET /api/meetings/{id}
GET        /api/meetings                  # все встречи с employeeId/Name/AvatarUrl (для Истории)

GET/POST   /api/scrum-notes               PUT /api/scrum-notes/{id}
```

## Ключевая логика фронтенда

- `urgency(lastMeetingDate, nextMeetingAt)` — срочность: если есть календарная дата, по ней
  («Сегодня, 14:30»), иначе от давности последнего 1-1 (ритм 7 дней). Управляет сортировкой
  дашборда, фильтрами Скоро/Просрочено, «Ближайшей встречей» в сайдбаре.
- Экран встречи `/meeting/:employeeId`: черновик заметок в localStorage
  (`meeting-draft-{id}`), «Завершить» → POST meeting с mood/duration/discussedTopics.
- Повестка живёт у сотрудника, не у встречи (единый список для карточки и экрана встречи).

## Безопасность

- Только `127.0.0.1:3000`; bcrypt-пароль ≥12 символов; JWT в httpOnly cookie (7 дней);
  rate limiting входа 5/5мин (Redis); подробнее — SECURITY.md
- Сброс пароля: `docker exec 1on1-backend sqlite3 /app/var/data/app.db "UPDATE settings SET password_hash = NULL WHERE id = 1"`

## Типичные задачи

- **Поле сущности**: Entity → миграция в `bin/init-db.php` (идемпотентный ALTER) →
  сериализация в контроллере → типы в `api/client.ts` → компоненты
- **Endpoint**: контроллер с `#[Route]` + `checkAuth` → функция в `api/client.ts`
- **Страница**: `pages/` → Route в `App.tsx` внутри `<ProtectedLayout>` (даёт AppShell) →
  пункт в навигацию `layout/AppShell.tsx`
- **Стиль**: только токены из `docs/plans/redesign-2026-07.md` (цвета, радиусы,
  easing `cubic-bezier(.22,1,.36,1)`), компоненты из `src/ui/`
