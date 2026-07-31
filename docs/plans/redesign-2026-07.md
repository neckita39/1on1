# План редизайна по спеке design_handoff_1on1_redesign

Источник: `/Users/nikitaserbo/Downloads/design_handoff_1on1_redesign/README.md` (полная спека,
538 строк, high-fidelity) + `prototype/Приложение 1-1.dc.html` (keyframes сняты, см. ниже).

## Ключевые токены (дизайн-система Битрикс24)

- Primary `#0075FF` (hover `#0065DE`), Link `#0154C8` (hover `#003C93`)
- Success `#1BCE7B`, Warning `#FAA72C`, Alert `#FF5752`
- AI `#853AF5` / фон `#F7F1FE` / бордер `#EADCFD` / текст `#5B22B0`; циан `#2FC6F6`
- Тёмный `#0A1B33`, текст на нём `#8FA6C4` / `#5D7692`
- Фон страницы `#F6FAFB`, карточки белые radius:16, бордер `#F0F0F0`, hover-бордер `#D8E8FF`/`#CFE3FF`
- Подложки синие `#EAF3FF` `#F8FBFF` `#DCEBFF`; нейтральные `#F4F7FA` `#EEF3F7` `#F0F4F7`
- Текст `#333333` / `#525C69` / `#828B95` / `#A5AEB8`; разделители `#F7F7F7` `#F0F0F0` `#E2E2E2`
- Серые элементы `#D5DDE5` `#DCE4EA` `#C9D3DC`
- Аватары: `#0075FF #853AF5 #1BCE7B #FAA72C #2FC6F6 #5B22B0`; пилюли: фон = цвет+`18`, текст = цвет
- Inter 400/500/600; заголовки вес 600 с отрицательным трекингом (28px→-.8px, 26→-.6px);
  эйбрау 10px ls .75px uppercase #828B95; tabular-nums для чисел
- Easing `cubic-bezier(.22,1,.36,1)`; микро .16–.25s, появление .4–.7s, прогресс .8–1.1s
- Кнопки r10 h40-46; инпуты r8-10 h40-44, focus `#0075FF` + ring `rgba(0,117,255,.14)`; модалка r18

## Keyframes (сняты из прототипа дословно)

```css
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes popIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
@keyframes slideRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}
@keyframes modalIn{from{opacity:0;transform:translateY(22px) scale(.97)}to{opacity:1;transform:none}}
@keyframes shimmer{from{background-position:-380px 0}to{background-position:380px 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes convL{0%{transform:translateX(-96px) scale(.4);opacity:0}55%{opacity:1}100%{transform:translateX(-26px) scale(1);opacity:1}}
@keyframes convR{0%{transform:translateX(96px) scale(.4);opacity:0}55%{opacity:1}100%{transform:translateX(26px) scale(1);opacity:1}}
@keyframes ringOut{0%{transform:scale(.55);opacity:0}35%{opacity:.9}100%{transform:scale(1.5);opacity:0}}
@keyframes dotPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.55);opacity:.35}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes sheen{0%{transform:translateX(-100%)}60%,100%{transform:translateX(320%)}}
@keyframes checkIn{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}
```

Плюс `@media (prefers-reduced-motion: reduce)` — отключить движение.

## Экраны и маршруты

| Спека | Маршрут | Что делаем |
|---|---|---|
| Splash | оверлей при старте сессии | 2.6s, sessionStorage-флаг, «Пропустить» |
| Login | /login | тёмная левая панель + белая правая; **только пароль** (реальный бэкенд), без email и кнопки Б24 |
| Setup | /setup | тот же визуальный язык |
| Команда | / | шапка-приветствие, 3 метрики, чипы Все/Скоро/Просрочено, сетка карточек, модалка добавления (сохранить Bitrix lookup!), поиск |
| Карточка | /employees/:id | шапка, левая колонка: пульс 8 встреч (mood), повестка (реальная агенда: категории/днд/звёздочка), досье-заметки, история; правая: блок Б24 (реальный bitrixStatus/link), договорённости=агенда-чекбоксы, без фейк-синка |
| Встреча | /meeting/:employeeId | таймер, повестка-чеклист с прогрессом и днд, заметки+автосейв-индикатор, настроение 1-5, Завершить→POST meeting (mood, duration) |
| Команд. заметки | /scrum | табы sos/topics/decisions (новая колонка tab), ⌘+Enter, карточки; сохранить редактирование |
| История | /history | 3 метрики + таблица всех встреч (новый GET /api/meetings) |
| Daily | /daily | функциональность как была (рулетка стендапа), новый визуал в AppShell |
| Important | /important | как было, новый визуал в AppShell |

Sidebar (236px, sticky): лого, навигация (Команда/Встреча/Daily/Important/Командные заметки/История)
с точками и бейджами, «БЛИЖАЙШАЯ ВСТРЕЧА» (самый просроченный по lastMeetingDate), профиль внизу
(логаут). Пункт «Встреча» ведёт на /meeting/<самый срочный>. Экран /employees/:id подсвечивает «Команда».

`dueDays` = 7 − днейС(lastMeetingDate); нет встреч → считаем просроченным (dueDays = −1, подпись «ещё не было»).

## Отступления от спеки (осознанные)

1. **Login без email и без «Войти через Битрикс24»** — бэкенд аутентифицирует только паролем.
2. **Заголовок встречи «1-1 · Имя»** вместо творительного падежа — в данных нет поля instr,
   склонять на лету нельзя (правило самой спеки).
3. **Блок «Регулярная встреча Б24»** — без фейковой демо-синхронизации: показывает реальный
   статус привязки (bitrixId), кнопка «Обновить из Битрикс24» перечитывает имя/аватар через
   bitrixPreview; чекбоксы синка и журнал появятся с реальным календарным синком (после редизайна,
   по словам пользователя). Тумблер и каркас блока — по спеке.
4. **Пульс/спарклайны** — на реальном mood из встреч; у старых встреч mood NULL → столбики-заглушки серым.
5. **Метрики дашборда** — из реальных данных: встречи за 7 дней, открытые пункты повестки
   (недообсуждённые), средний mood. Проценты прогресс-полос — нормировка от целевых значений.
6. **i18n** — новые экраны на русском (продукт русскоязычный по спеке); инфраструктура i18n не ломается.
7. **Команд. заметки**: теги/люди из спеки не реализуются (нет данных) — карточка: таб-пилюля, дата, текст, редактирование.

## Бэкенд-изменения

1. `meetings`: +`mood INTEGER NULL` (1–5), +`duration INTEGER NULL` (минуты) — миграция в
   init-db.php, Entity, сериализация в list/create/show, приём в POST.
2. `scrum_notes`: +`tab VARCHAR(20) NOT NULL DEFAULT 'sos'` — миграция, Entity, приём в POST/PUT.
3. Новый `GET /api/meetings` — все встречи DESC с employeeId/employeeName/avatarUrl/mood/duration.

## Файлы фронтенда

- `tailwind.config.js` — цвета/шрифты/keyframes токенами
- `src/index.css` — базовые стили, keyframes, reduced-motion
- `src/ui/` — Avatar, Pill, Button, Spinner, Checkbox, Toggle, Toast(context), Modal, Skeleton, Metric
- `src/layout/AppShell.tsx` — sidebar + main + 480ms скелетон при смене маршрута
- `src/pages/*` — переписываются; `src/components/AgendaList.tsx` — рестайл с сохранением днд/категорий
- `index.html` — Inter с Google Fonts, title «Один на один», lang=ru

## Статус восстановления данных (сделано в этой сессии)

Контейнеры были созданы из старого пути `/Volumes/projects/1on1` → после рестарта пустая БД.
Исправлено: пересозданы из `/Volumes/projects/pet/1on1`, данные на месте (12 сотрудников,
57 встреч, 138 агенда, 7 скрам-заметок). Бэкап: `backups/app.db.pre-remount-20260731_214339.bak`.
Мусор остался: `/Volumes/projects/1on1` (пустая БД от 31.07) — удалить вручную.
