# 1-on-1 Meetings Application

Web-приложение для тимлида для управления 1-1 встречами с подчинёнными.

## Быстрый старт

```bash
# Запуск
docker-compose up --build

# Доступ: http://1on1.bx:3000 (требует записи в /etc/hosts)
# Или: http://localhost:3000
```

## Стек технологий

- **Backend**: Symfony 7 (PHP 8.3) + Doctrine ORM + SQLite
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Контейнеризация**: Docker + docker-compose
- **Кэш/Rate Limiting**: Redis 7
- **Локализация**: English / Русский

## Безопасность

Приложение содержит личные данные сотрудников, поэтому реализованы следующие меры защиты:

### Сетевая безопасность
- **Порт закрыт для внешнего доступа**: приложение доступно только на `127.0.0.1:3000` (localhost)
- Для доступа из локальной сети настройте reverse proxy (nginx/Traefik) с дополнительной защитой

### Аутентификация
- **Минимальная длина пароля**: 12 символов
- **Безопасное хранение**: пароль хешируется с помощью `password_hash()` (bcrypt)
- **JWT токены**: httpOnly cookie, срок жизни 7 дней
- **Длинные секреты**: APP_SECRET и JWT_SECRET по 64 символа (сгенерированы через `openssl rand -hex 32`)

### Защита от атак
- **Rate limiting**: максимум 5 неудачных попыток входа за 5 минут
- Блокировка по IP адресу при превышении лимита
- **CSRF защита**: SameSite cookie policy ('lax')

### Резервное копирование
```bash
# Создать backup базы данных
./backup.sh

# Восстановить из backup'а
./restore.sh

# Backup'ы хранятся в ./backups/ (сжатые .gz)
# Автоматическая очистка backup'ов старше 30 дней
```

### Дополнительные рекомендации
- Регулярно создавайте backup БД (настройте cron: `0 2 * * * /path/to/backup.sh`)
- Храните backup'ы в безопасном месте (отдельный диск, облако)
- Используйте сложные пароли (минимум 12 символов, разные типы символов)
- Не выкладывайте `.env` файл в публичные репозитории

### Сброс пароля
```bash
# Полная пересоздание БД (ПОТЕРЯ ВСЕХ ДАННЫХ!)
docker exec 1on1-backend php bin/init-db.php

# Или только сброс пароля (данные сохраняются)
docker exec 1on1-backend sqlite3 /app/var/data/app.db \
  "UPDATE settings SET password_hash = NULL WHERE id = 1"
```

## Структура проекта

```
/Volumes/projects/1on1/
├── docker-compose.yml          # Оркестрация контейнеров
├── .env                        # APP_SECRET, JWT_SECRET
├── data/                       # SQLite данные (volume)
│
├── backend/                    # Symfony API
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
│   │   └── init-db.php         # Инициализация SQLite схемы + миграции
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
│           └── AuthService.php
│
└── frontend/                   # React SPA
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── nginx.conf              # Проксирование /api/* на backend
    ├── index.html
    └── src/
        ├── main.tsx
        ├── index.css
        ├── App.tsx             # Роутинг + AuthContext + I18nProvider
        ├── api/
        │   └── client.ts       # Axios + типы + API функции
        ├── i18n/               # Локализация
        │   ├── index.ts
        │   ├── I18nContext.tsx
        │   └── translations.ts # Переводы EN/RU
        ├── pages/
        │   ├── SetupPage.tsx   # Первоначальная установка пароля
        │   ├── LoginPage.tsx   # Вход по паролю
        │   ├── HomePage.tsx    # Список сотрудников
        │   └── EmployeePage.tsx # Детали + повестка + история
        └── components/
            ├── EmployeeCard.tsx
            ├── AgendaList.tsx      # Drag & drop + категории
            ├── MeetingForm.tsx
            ├── MeetingHistory.tsx
            └── LanguageSwitcher.tsx # Переключатель языка
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
- Relations: OneToMany → Meeting, AgendaItem

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
GET  /api/auth/check   → { needsSetup: bool, isAuthenticated: bool }
POST /api/auth/setup   → { password } → устанавливает пароль (только если needsSetup)
POST /api/auth/login   → { password } → возвращает JWT cookie
POST /api/auth/logout  → очищает cookie
```

### Сотрудники (требуют авторизации)
```
GET    /api/employees          → список с lastMeetingDate и agendaCount
POST   /api/employees          → { name, position?, bio? }
GET    /api/employees/{id}
PUT    /api/employees/{id}     → { name?, position?, bio? }
DELETE /api/employees/{id}     → каскадно удаляет meetings и agenda
```

### Повестка
```
GET    /api/employees/{id}/agenda      → список пунктов (сортировка по sortOrder)
POST   /api/employees/{id}/agenda      → { content, category? }
PUT    /api/agenda/{id}                → { content?, isDiscussed?, category? }
PUT    /api/employees/{id}/agenda/reorder → { itemIds: number[] } # изменение порядка
DELETE /api/agenda/{id}
```

### Встречи
```
GET    /api/employees/{id}/meetings    → история встреч (включает discussedTopics)
POST   /api/employees/{id}/meetings    → { notes, date?, discussedTopics?: string[] }
GET    /api/meetings/{id}
```

## Локализация

Приложение поддерживает два языка:
- 🇬🇧 English
- 🇷🇺 Русский

### Как работает
- Язык автоматически определяется по настройкам браузера
- Выбор сохраняется в `localStorage`
- Переключатель доступен на страницах входа и в хедере

### Добавление переводов
1. Открыть `frontend/src/i18n/translations.ts`
2. Добавить ключ в оба объекта `en` и `ru`
3. Использовать в компоненте: `const { t } = useI18n(); t('ключ')`

## Аутентификация

- Пароль хранится как `password_hash()` в таблице settings
- JWT токен в httpOnly cookie, срок жизни 7 дней
- Секрет для JWT: переменная `JWT_SECRET` из .env

### Сброс пароля
```bash
docker exec -it 1on1-backend-1 php bin/init-db.php  # пересоздать БД (потеря данных)
# или
docker exec -it 1on1-backend-1 sqlite3 /app/var/data/app.db "UPDATE settings SET password_hash = NULL WHERE id = 1"
```

## Docker

### Контейнеры
- `1on1-redis`: Redis 7 (rate limiting, maxmemory 64MB)
- `1on1-backend`: PHP-FPM + Nginx + Supervisor + PHP Redis extension
- `1on1-frontend`: Nginx со статикой + проксирование API

### Volumes
- `./data:/app/var/data` - SQLite база данных

### Порты
- `127.0.0.1:3000` - фронтенд (только localhost)

### Пересборка
```bash
docker-compose down
docker-compose up --build
```

### Миграция базы данных
```bash
docker exec -it 1on1-backend-1 php bin/init-db.php
```

## Разработка

### Backend (без Docker)
```bash
cd backend
composer install
php -S localhost:8080 -t public
```

### Frontend (без Docker)
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173, прокси на localhost:8080
```

## Типичные задачи

### Добавить поле к сущности
1. Изменить Entity в `backend/src/Entity/`
2. Обновить схему в `backend/bin/init-db.php` (добавить миграцию)
3. Добавить в контроллер сериализацию нового поля
4. Обновить типы в `frontend/src/api/client.ts`
5. Использовать в компонентах

### Добавить новый endpoint
1. Создать метод в контроллере с атрибутом `#[Route(...)]`
2. Добавить проверку авторизации: `if ($error = $this->checkAuth($request)) return $error;`
3. Добавить функцию в `frontend/src/api/client.ts`

### Добавить новую страницу
1. Создать компонент в `frontend/src/pages/`
2. Добавить Route в `frontend/src/App.tsx`
3. Обернуть в `<ProtectedRoute>` если требует авторизации

### Добавить новый язык
1. Добавить объект с переводами в `frontend/src/i18n/translations.ts`
2. Добавить язык в `frontend/src/components/LanguageSwitcher.tsx`
3. Обновить `detectLanguage()` в `frontend/src/i18n/I18nContext.tsx`
