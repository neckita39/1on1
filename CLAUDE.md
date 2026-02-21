# 1-on-1 Meetings Application

Web-приложение для тимлида для управления 1-1 встречами с подчинёнными. Позволяет вести список сотрудников с досье, формировать повестку к встречам (с категориями и drag & drop), фиксировать результаты встреч и хранить историю.

## Быстрый старт

```bash
# Запуск
docker-compose up --build

# Доступ
# http://localhost:3000
# http://1on1.bx:3000  (требует записи в /etc/hosts)
```

При первом запуске приложение попросит задать пароль (минимум 12 символов).

### Демо режим

Для тестирования и демонстрации доступен режим с предзаполненными данными:

```bash
./setup-demo.sh          # Создать и переключиться на демо-базу
./switch-to-demo.sh      # Переключиться на демо (если уже создана)
./switch-to-prod.sh      # Вернуться на продовскую базу
```

**Демо данные:** пароль `demo12345678`, 6 сотрудников, 6 встреч, 24 пункта повестки (все категории).

При первом запуске `setup-demo.sh` автоматически создаст резервную копию продовской базы в `app.prod.db`.

## Стек технологий

- **Backend**: Symfony 7 (PHP 8.3) + Doctrine ORM + SQLite
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Контейнеризация**: Docker + docker-compose
- **Rate Limiting**: Redis 7
- **Локализация**: English / Русский

## Структура проекта

```
├── docker-compose.yml           # Оркестрация контейнеров
├── .env                         # APP_SECRET, JWT_SECRET, USE_DEMO_DB
├── SECURITY.md                  # Документация по безопасности
├── data/                        # SQLite данные (volume)
├── backups/                     # Резервные копии БД (.gz)
├── backup.sh                    # Скрипт создания backup'а
├── restore.sh                   # Скрипт восстановления из backup'а
├── setup-demo.sh                # Создание демо-базы
├── switch-to-demo.sh            # Переключение на демо
├── switch-to-prod.sh            # Переключение на продовскую базу
│
├── backend/                     # Symfony API
│   ├── Dockerfile
│   ├── composer.json
│   ├── config/
│   │   ├── bundles.php
│   │   ├── services.yaml
│   │   ├── routes.yaml
│   │   └── packages/
│   │       ├── framework.yaml
│   │       └── doctrine.yaml
│   ├── public/index.php
│   ├── bin/
│   │   ├── console
│   │   ├── init-db.php          # Инициализация SQLite схемы + миграции
│   │   └── init-demo-db.php     # Наполнение демо-данными
│   ├── docker/
│   │   ├── nginx.conf
│   │   ├── supervisord.conf
│   │   └── entrypoint.sh
│   └── src/
│       ├── Kernel.php
│       ├── Controller/
│       │   ├── AuthController.php
│       │   ├── EmployeeController.php
│       │   ├── MeetingController.php
│       │   └── AgendaController.php
│       ├── Entity/
│       │   ├── Settings.php
│       │   ├── Employee.php
│       │   ├── Meeting.php
│       │   └── AgendaItem.php
│       ├── Repository/
│       │   ├── SettingsRepository.php
│       │   ├── EmployeeRepository.php
│       │   ├── MeetingRepository.php
│       │   └── AgendaItemRepository.php
│       └── Service/
│           ├── AuthService.php
│           └── RateLimiter.php  # Rate limiting через Redis
│
└── frontend/                    # React SPA
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── nginx.conf               # Проксирование /api/* на backend
    ├── index.html
    └── src/
        ├── main.tsx
        ├── index.css
        ├── App.tsx              # Роутинг + AuthContext + I18nProvider
        ├── api/
        │   └── client.ts        # Axios + типы + API функции
        ├── i18n/                 # Локализация
        │   ├── index.ts
        │   ├── I18nContext.tsx
        │   └── translations.ts  # Переводы EN/RU
        ├── pages/
        │   ├── SetupPage.tsx    # Первоначальная установка пароля
        │   ├── LoginPage.tsx    # Вход по паролю
        │   ├── HomePage.tsx     # Список сотрудников
        │   └── EmployeePage.tsx # Детали + повестка + история
        └── components/
            ├── EmployeeCard.tsx
            ├── AgendaList.tsx       # Drag & drop + категории
            ├── MeetingForm.tsx
            ├── MeetingHistory.tsx
            ├── ClockWidget.tsx      # Виджет часов
            └── LanguageSwitcher.tsx  # Переключатель языка
```

## Модель данных

### Settings (Настройки приложения)
- `id`: int (PK, всегда 1)
- `passwordHash`: string|null (NULL = пароль не установлен)
- `createdAt`: DateTime

### Employee (Сотрудник)
- `id`: int (PK, auto)
- `name`: string
- `position`: string|null
- `bio`: text|null (досье: город, семейное положение, хобби и т.д.)
- `createdAt`: DateTime
- Relations: OneToMany -> Meeting, AgendaItem

### Meeting (Встреча)
- `id`: int (PK, auto)
- `employee`: Employee (ManyToOne)
- `date`: DateTime
- `notes`: text
- `discussedTopics`: JSON array (темы из агенды, обсуждённые на встрече)
- `createdAt`: DateTime

### AgendaItem (Пункт повестки)
- `id`: int (PK, auto)
- `employee`: Employee (ManyToOne)
- `content`: string
- `isDiscussed`: bool
- `category`: string (note | positive | warning | problem)
- `sortOrder`: int (порядок отображения для drag & drop)
- `createdAt`: DateTime

#### Категории тем
| Категория | Описание | Цвет |
|-----------|----------|------|
| `note` | Заметка (по умолчанию) | Серый |
| `positive` | Позитивная обратная связь | Зелёный |
| `warning` | Замечание | Жёлтый |
| `problem` | Проблема | Красный |

## API Endpoints

### Аутентификация (публичные)
```
GET  /api/auth/check   -> { needsSetup, isAuthenticated }
POST /api/auth/setup   -> { password } (только если needsSetup)
POST /api/auth/login   -> { password } -> JWT cookie
POST /api/auth/logout  -> очищает cookie
```

### Сотрудники (требуют авторизации)
```
GET    /api/employees          -> список с lastMeetingDate и agendaCount
POST   /api/employees          -> { name, position?, bio? }
GET    /api/employees/{id}
PUT    /api/employees/{id}     -> { name?, position?, bio? }
DELETE /api/employees/{id}     -> каскадно удаляет meetings и agenda
```

### Повестка
```
GET    /api/employees/{id}/agenda          -> список (сортировка по sortOrder)
POST   /api/employees/{id}/agenda          -> { content, category? }
PUT    /api/agenda/{id}                    -> { content?, isDiscussed?, category? }
PUT    /api/employees/{id}/agenda/reorder  -> { itemIds: number[] }
DELETE /api/agenda/{id}
```

### Встречи
```
GET    /api/employees/{id}/meetings    -> история встреч
POST   /api/employees/{id}/meetings    -> { notes, date?, discussedTopics?: string[] }
GET    /api/meetings/{id}
```

## Безопасность

Подробная документация в [SECURITY.md](SECURITY.md).

- Доступ только на `127.0.0.1:3000` (localhost)
- Пароль минимум 12 символов, хранится как bcrypt хеш
- JWT токен в httpOnly cookie, срок жизни 7 дней
- Rate limiting: 5 неудачных попыток входа за 5 минут (Redis)
- CSRF защита: SameSite cookie policy

### Резервное копирование
```bash
./backup.sh              # Создать backup (сжатый .gz, хранится в ./backups/)
./restore.sh             # Восстановить из backup'а
```

### Сброс пароля
```bash
# Сброс пароля (данные сохраняются)
docker exec 1on1-backend sqlite3 /app/var/data/app.db \
  "UPDATE settings SET password_hash = NULL WHERE id = 1"

# Полная пересоздание БД (ПОТЕРЯ ВСЕХ ДАННЫХ!)
docker exec 1on1-backend php bin/init-db.php
```

## Docker

### Контейнеры
- `1on1-redis` — Redis 7 (rate limiting, maxmemory 64MB)
- `1on1-backend` — PHP-FPM 8.3 + Nginx + Supervisor
- `1on1-frontend` — Nginx со статикой + проксирование API

### Volumes
- `./data:/app/var/data` — SQLite база данных

### Порты
- `127.0.0.1:3000` — фронтенд (только localhost)

### Пересборка
```bash
docker-compose down && docker-compose up --build
```

## Локализация

- English / Русский
- Язык определяется по настройкам браузера, выбор сохраняется в `localStorage`
- Переключатель на страницах входа и в хедере

### Добавление переводов
1. Добавить ключ в `en` и `ru` в `frontend/src/i18n/translations.ts`
2. Использовать: `const { t } = useI18n(); t('ключ')`

## Разработка

### Backend (без Docker)
```bash
cd backend && composer install
php -S localhost:8080 -t public
```

### Frontend (без Docker)
```bash
cd frontend && npm install
npm run dev  # http://localhost:5173, прокси на localhost:8080
```

## Типичные задачи

### Добавить поле к сущности
1. Изменить Entity в `backend/src/Entity/`
2. Добавить миграцию в `backend/bin/init-db.php`
3. Добавить сериализацию в контроллере
4. Обновить типы в `frontend/src/api/client.ts`
5. Использовать в компонентах

### Добавить новый endpoint
1. Создать метод в контроллере с `#[Route(...)]`
2. Добавить проверку авторизации: `if ($error = $this->checkAuth($request)) return $error;`
3. Добавить функцию в `frontend/src/api/client.ts`

### Добавить новую страницу
1. Создать компонент в `frontend/src/pages/`
2. Добавить Route в `frontend/src/App.tsx`
3. Обернуть в `<ProtectedRoute>` если требует авторизации

### Добавить новый язык
1. Добавить переводы в `frontend/src/i18n/translations.ts`
2. Добавить в `frontend/src/components/LanguageSwitcher.tsx`
3. Обновить `detectLanguage()` в `frontend/src/i18n/I18nContext.tsx`
