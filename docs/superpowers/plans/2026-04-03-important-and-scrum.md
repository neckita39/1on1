# Important Items & Scrum of Scrums — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Important" flag to agenda items with a dedicated view page, and a standalone "Scrum of Scrums" notes section.

**Architecture:** Two independent features sharing the same navigation pattern. Feature 1 extends the existing AgendaItem entity with a boolean flag and adds a cross-employee listing endpoint. Feature 2 introduces a new ScrumNote entity with its own controller, following the exact same patterns as existing entities (Meeting, AgendaItem).

**Tech Stack:** Symfony 7 / PHP 8.3 / Doctrine ORM / SQLite (backend), React 18 / TypeScript / Tailwind CSS (frontend)

**Spec:** `docs/superpowers/specs/2026-04-03-important-and-scrum-design.md`

---

## File Map

### Feature 1: Important Items
| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `backend/bin/init-db.php` | Add `is_important` column migration |
| Modify | `backend/src/Entity/AgendaItem.php` | Add `isImportant` field + getter/setter |
| Modify | `backend/src/Controller/AgendaController.php` | Handle `isImportant` in update, add `listImportant` endpoint |
| Modify | `frontend/src/api/client.ts` | Add `isImportant` to interface, add `agendaApi.important()` |
| Modify | `frontend/src/i18n/translations.ts` | Add translation keys |
| Modify | `frontend/src/components/AgendaList.tsx` | Add star toggle to each item |
| Create | `frontend/src/pages/ImportantPage.tsx` | Dedicated page for important items |
| Modify | `frontend/src/App.tsx` | Add route for `/important` |
| Modify | `frontend/src/pages/HomePage.tsx` | Add "Important" navigation button |

### Feature 2: Scrum of Scrums
| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `backend/bin/init-db.php` | Add `scrum_notes` table |
| Create | `backend/src/Entity/ScrumNote.php` | ScrumNote entity |
| Create | `backend/src/Repository/ScrumNoteRepository.php` | Repository |
| Create | `backend/src/Controller/ScrumController.php` | List, create, update endpoints |
| Modify | `frontend/src/api/client.ts` | Add `ScrumNote` interface + `scrumApi` |
| Modify | `frontend/src/i18n/translations.ts` | Add translation keys |
| Create | `frontend/src/pages/ScrumPage.tsx` | Scrum notes page |
| Modify | `frontend/src/App.tsx` | Add route for `/scrum` |
| Modify | `frontend/src/pages/HomePage.tsx` | Add "Scrum" navigation button |

---

## Task 1: Backend — Add `isImportant` to AgendaItem

**Files:**
- Modify: `backend/bin/init-db.php:64-72` (add migration after existing agenda_items migrations)
- Modify: `backend/src/Entity/AgendaItem.php:36-40` (add field after `sortOrder`)

- [ ] **Step 1: Add migration in `init-db.php`**

Add after the existing `sort_order` migration block (after line 72 in `backend/bin/init-db.php`):

```php
// Migration: add is_important column to agenda_items if not exists
$agendaCols3 = $pdo->query("PRAGMA table_info(agenda_items)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('is_important', $agendaCols3)) {
    $pdo->exec("ALTER TABLE agenda_items ADD COLUMN is_important INTEGER NOT NULL DEFAULT 0");
}
```

- [ ] **Step 2: Add field to `AgendaItem` entity**

Add after the `$sortOrder` property (after line 37 in `backend/src/Entity/AgendaItem.php`):

```php
#[ORM\Column(type: Types::BOOLEAN)]
private bool $isImportant = false;
```

Add getter/setter after `getSortOrder`/`setSortOrder` methods (after line 108):

```php
public function isImportant(): bool
{
    return $this->isImportant;
}

public function setIsImportant(bool $isImportant): self
{
    $this->isImportant = $isImportant;
    return $this;
}
```

- [ ] **Step 3: Update `AgendaController::update` to handle `isImportant`**

In `backend/src/Controller/AgendaController.php`, in the `update` method, add after the `category` handling (after line 124):

```php
if (isset($data['isImportant'])) {
    $item->setIsImportant((bool) $data['isImportant']);
}
```

Also update the JSON response in `update` method (line 128-135) — add `isImportant`:

```php
return $this->json([
    'id' => $item->getId(),
    'content' => $item->getContent(),
    'isDiscussed' => $item->isDiscussed(),
    'isImportant' => $item->isImportant(),
    'category' => $item->getCategory(),
    'sortOrder' => $item->getSortOrder(),
    'createdAt' => $item->getCreatedAt()->format('c')
]);
```

Update the same serialization in the `list` method (lines 48-55) and `create` method (lines 94-101) — add `'isImportant' => $item->isImportant()` to both.

- [ ] **Step 4: Add `listImportant` endpoint to `AgendaController`**

Add a new method in `backend/src/Controller/AgendaController.php` before the `delete` method:

```php
#[Route('/api/agenda/important', methods: ['GET'])]
public function listImportant(Request $request): JsonResponse
{
    if ($error = $this->checkAuth($request)) return $error;

    $items = $this->agendaItemRepository->findBy(
        ['isImportant' => true],
        ['createdAt' => 'DESC']
    );

    return $this->json(array_map(fn(AgendaItem $item) => [
        'id' => $item->getId(),
        'content' => $item->getContent(),
        'category' => $item->getCategory(),
        'isDiscussed' => $item->isDiscussed(),
        'isImportant' => $item->isImportant(),
        'createdAt' => $item->getCreatedAt()->format('c'),
        'employeeId' => $item->getEmployee()->getId(),
        'employeeName' => $item->getEmployee()->getName(),
    ], $items));
}
```

**Important:** This route MUST be placed before the `#[Route('/api/agenda/{id}', ...)]` routes, otherwise Symfony will try to match "important" as an `{id}` parameter.

- [ ] **Step 5: Commit**

```bash
git add backend/bin/init-db.php backend/src/Entity/AgendaItem.php backend/src/Controller/AgendaController.php
git commit -m "feat: add isImportant flag to AgendaItem with listing endpoint"
```

---

## Task 2: Backend — ScrumNote entity, repository, and controller

**Files:**
- Modify: `backend/bin/init-db.php` (add scrum_notes table)
- Create: `backend/src/Entity/ScrumNote.php`
- Create: `backend/src/Repository/ScrumNoteRepository.php`
- Create: `backend/src/Controller/ScrumController.php`

- [ ] **Step 1: Add `scrum_notes` table in `init-db.php`**

Add after the `is_important` migration block:

```php
// Create scrum_notes table
$pdo->exec("
    CREATE TABLE IF NOT EXISTS scrum_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        date DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
");
```

- [ ] **Step 2: Create `ScrumNote` entity**

Create `backend/src/Entity/ScrumNote.php`:

```php
<?php

namespace App\Entity;

use App\Repository\ScrumNoteRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ScrumNoteRepository::class)]
#[ORM\Table(name: 'scrum_notes')]
class ScrumNote
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT)]
    private string $content;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTime $date;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTime $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTime $updatedAt;

    public function __construct()
    {
        $this->date = new \DateTime();
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
        $this->content = '';
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getContent(): string
    {
        return $this->content;
    }

    public function setContent(string $content): self
    {
        $this->content = $content;
        return $this;
    }

    public function getDate(): \DateTime
    {
        return $this->date;
    }

    public function setDate(\DateTime $date): self
    {
        $this->date = $date;
        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTime
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTime $updatedAt): self
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }
}
```

- [ ] **Step 3: Create `ScrumNoteRepository`**

Create `backend/src/Repository/ScrumNoteRepository.php`:

```php
<?php

namespace App\Repository;

use App\Entity\ScrumNote;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ScrumNoteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ScrumNote::class);
    }
}
```

- [ ] **Step 4: Create `ScrumController`**

Create `backend/src/Controller/ScrumController.php`:

```php
<?php

namespace App\Controller;

use App\Entity\ScrumNote;
use App\Repository\ScrumNoteRepository;
use App\Service\AuthService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class ScrumController extends AbstractController
{
    public function __construct(
        private ScrumNoteRepository $scrumNoteRepository,
        private EntityManagerInterface $em,
        private AuthService $authService
    ) {}

    private function checkAuth(Request $request): ?JsonResponse
    {
        if (!$this->authService->isAuthenticated($request)) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }
        return null;
    }

    #[Route('/api/scrum-notes', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $notes = $this->scrumNoteRepository->findBy([], ['date' => 'DESC']);

        return $this->json(array_map(fn(ScrumNote $note) => [
            'id' => $note->getId(),
            'content' => $note->getContent(),
            'date' => $note->getDate()->format('Y-m-d'),
            'createdAt' => $note->getCreatedAt()->format('c'),
            'updatedAt' => $note->getUpdatedAt()->format('c'),
        ], $notes));
    }

    #[Route('/api/scrum-notes', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $data = json_decode($request->getContent(), true);

        if (empty($data['content'])) {
            return $this->json(['error' => 'Content is required'], Response::HTTP_BAD_REQUEST);
        }

        $note = new ScrumNote();
        $note->setContent($data['content']);

        if (!empty($data['date'])) {
            $note->setDate(new \DateTime($data['date']));
        }

        $this->em->persist($note);
        $this->em->flush();

        return $this->json([
            'id' => $note->getId(),
            'content' => $note->getContent(),
            'date' => $note->getDate()->format('Y-m-d'),
            'createdAt' => $note->getCreatedAt()->format('c'),
            'updatedAt' => $note->getUpdatedAt()->format('c'),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/scrum-notes/{id}', methods: ['PUT'])]
    public function update(Request $request, int $id): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $note = $this->scrumNoteRepository->find($id);
        if (!$note) {
            return $this->json(['error' => 'Scrum note not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['content']) && !empty($data['content'])) {
            $note->setContent($data['content']);
        }
        if (!empty($data['date'])) {
            $note->setDate(new \DateTime($data['date']));
        }

        $note->setUpdatedAt(new \DateTime());
        $this->em->flush();

        return $this->json([
            'id' => $note->getId(),
            'content' => $note->getContent(),
            'date' => $note->getDate()->format('Y-m-d'),
            'createdAt' => $note->getCreatedAt()->format('c'),
            'updatedAt' => $note->getUpdatedAt()->format('c'),
        ]);
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/bin/init-db.php backend/src/Entity/ScrumNote.php backend/src/Repository/ScrumNoteRepository.php backend/src/Controller/ScrumController.php
git commit -m "feat: add ScrumNote entity with list/create/update API"
```

---

## Task 3: Frontend — API client + translations

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/i18n/translations.ts`

- [ ] **Step 1: Update `AgendaItem` interface and add `agendaApi.important`**

In `frontend/src/api/client.ts`, add `isImportant` to the `AgendaItem` interface (after line 37 `category`):

```typescript
export interface AgendaItem {
  id: number
  content: string
  isDiscussed: boolean
  isImportant: boolean
  category: AgendaCategory
  sortOrder: number
  createdAt: string
}
```

Add a new interface for important items (after the `AgendaItem` interface):

```typescript
export interface ImportantItem extends AgendaItem {
  employeeId: number
  employeeName: string
}
```

Add `important` method to `agendaApi` (after the `reorder` method, line 75):

```typescript
important: () => api.get<ImportantItem[]>('/agenda/important'),
```

Also update the `agendaApi.update` signature to include `isImportant` (line 71):

```typescript
update: (id: number, data: { content?: string; isDiscussed?: boolean; isImportant?: boolean; category?: AgendaCategory }) =>
  api.put<AgendaItem>(`/agenda/${id}`, data),
```

- [ ] **Step 2: Add `ScrumNote` interface and `scrumApi`**

Add after the `meetingsApi` object (after line 83 in `frontend/src/api/client.ts`):

```typescript
export interface ScrumNote {
  id: number
  content: string
  date: string
  createdAt: string
  updatedAt: string
}

export const scrumApi = {
  list: () => api.get<ScrumNote[]>('/scrum-notes'),
  create: (data: { content: string; date?: string }) =>
    api.post<ScrumNote>('/scrum-notes', data),
  update: (id: number, data: { content?: string; date?: string }) =>
    api.put<ScrumNote>(`/scrum-notes/${id}`, data),
}
```

- [ ] **Step 3: Add translations**

In `frontend/src/i18n/translations.ts`, add to the `en` object (after the `dailyBack` line):

```typescript
// Important
important: 'Important',
importantTitle: 'Important Items',
noImportantItems: 'No important items yet.',
importantBack: 'Back',

// Scrum
scrum: 'Scrum of Scrums',
scrumTitle: 'Scrum of Scrums',
scrumNew: 'New Entry',
scrumDate: 'Date',
scrumContent: 'Notes',
scrumContentPlaceholder: 'Meeting notes...',
scrumNoEntries: 'No entries yet.',
scrumBack: 'Back',
scrumEdit: 'Edit',
scrumSave: 'Save',
```

Add to the `ru` object (after `dailyBack`):

```typescript
// Important
important: 'Важное',
importantTitle: 'Важные пункты',
noImportantItems: 'Нет важных пунктов.',
importantBack: 'Назад',

// Scrum
scrum: 'Скрам над скрамом',
scrumTitle: 'Скрам над скрамом',
scrumNew: 'Новая запись',
scrumDate: 'Дата',
scrumContent: 'Заметки',
scrumContentPlaceholder: 'Заметки о встрече...',
scrumNoEntries: 'Пока нет записей.',
scrumBack: 'Назад',
scrumEdit: 'Редактировать',
scrumSave: 'Сохранить',
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/i18n/translations.ts
git commit -m "feat: add API client types and translations for important items and scrum notes"
```

---

## Task 4: Frontend — Star toggle in AgendaList

**Files:**
- Modify: `frontend/src/components/AgendaList.tsx`

- [ ] **Step 1: Add `handleToggleImportant` handler**

In `frontend/src/components/AgendaList.tsx`, add after `handleToggle` (after line 56):

```typescript
const handleToggleImportant = async (item: AgendaItem) => {
  try {
    await agendaApi.update(item.id, { isImportant: !item.isImportant })
    onUpdate()
  } catch (error) {
    console.error('Failed to toggle important', error)
  }
}
```

- [ ] **Step 2: Add star icon to active items**

In the active items list (line 198-249), add a star button after the drag handle and checkbox div (inside the `<li>`, after the closing `</div>` of the checkbox container around line 219, before the `<div className="flex-1 min-w-0">` div):

```tsx
<button
  onClick={() => handleToggleImportant(item)}
  className="flex-shrink-0 pt-0.5"
  title={t('important')}
>
  {item.isImportant ? (
    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-gray-300 hover:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )}
</button>
```

- [ ] **Step 3: Add star icon to discussed items**

In the discussed items list (lines 257-280), add the same star button after the checkbox input and before the `<div className="flex-1 min-w-0">`:

```tsx
<button
  onClick={() => handleToggleImportant(item)}
  className="flex-shrink-0 mt-0.5"
  title={t('important')}
>
  {item.isImportant ? (
    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-gray-300 hover:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )}
</button>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AgendaList.tsx
git commit -m "feat: add star toggle for important items in AgendaList"
```

---

## Task 5: Frontend — ImportantPage

**Files:**
- Create: `frontend/src/pages/ImportantPage.tsx`

- [ ] **Step 1: Create `ImportantPage`**

Create `frontend/src/pages/ImportantPage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { agendaApi, ImportantItem, AgendaCategory } from '../api/client'
import { useI18n } from '../i18n'

const categoryColors: Record<AgendaCategory, string> = {
  note: 'bg-gray-50 border-l-4 border-gray-300',
  positive: 'bg-green-50 border-l-4 border-green-500',
  warning: 'bg-yellow-50 border-l-4 border-yellow-500',
  problem: 'bg-red-50 border-l-4 border-red-500',
}

export default function ImportantPage() {
  const [items, setItems] = useState<ImportantItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t, language } = useI18n()

  const loadItems = async () => {
    try {
      const res = await agendaApi.important()
      setItems(res.data)
    } catch (error) {
      console.error('Failed to load important items', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const handleUnmark = async (id: number) => {
    try {
      await agendaApi.update(id, { isImportant: false })
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('Failed to unmark important', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{t('importantTitle')}</h1>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {t('importantBack')}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">{t('noImportantItems')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-md ${categoryColors[item.category]}`}
              >
                <button
                  onClick={() => handleUnmark(item.id)}
                  className="flex-shrink-0 pt-0.5"
                  title={t('important')}
                >
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`break-words ${item.isDiscussed ? 'line-through opacity-60' : ''}`}>
                    {item.content}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Link
                      to={`/employees/${item.employeeId}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {item.employeeName}
                    </Link>
                    <span>&middot;</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ImportantPage.tsx
git commit -m "feat: add ImportantPage for viewing important agenda items"
```

---

## Task 6: Frontend — ScrumPage

**Files:**
- Create: `frontend/src/pages/ScrumPage.tsx`

- [ ] **Step 1: Create `ScrumPage`**

Create `frontend/src/pages/ScrumPage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { scrumApi, ScrumNote } from '../api/client'
import { useI18n } from '../i18n'

export default function ScrumPage() {
  const [notes, setNotes] = useState<ScrumNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editDate, setEditDate] = useState('')
  const navigate = useNavigate()
  const { t, language } = useI18n()

  const loadNotes = async () => {
    try {
      const res = await scrumApi.list()
      setNotes(res.data)
    } catch (error) {
      console.error('Failed to load scrum notes', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return

    setSaving(true)
    try {
      await scrumApi.create({ content: newContent.trim(), date: newDate })
      setNewContent('')
      setNewDate(new Date().toISOString().split('T')[0])
      setShowForm(false)
      loadNotes()
    } catch (error) {
      console.error('Failed to create scrum note', error)
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = (note: ScrumNote) => {
    setEditingId(note.id)
    setEditContent(note.content)
    setEditDate(note.date)
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editingId === null) return

    setSaving(true)
    try {
      await scrumApi.update(editingId, { content: editContent.trim(), date: editDate })
      setEditingId(null)
      setEditContent('')
      setEditDate('')
      loadNotes()
    } catch (error) {
      console.error('Failed to update scrum note', error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{t('scrumTitle')}</h1>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {t('scrumBack')}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            {t('scrumNew')}
          </button>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white shadow rounded-lg p-4 mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('scrumDate')}</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('scrumContent')}</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={8}
                placeholder={t('scrumContentPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !newContent.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? t('saving') : t('scrumSave')}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewContent(''); setNewDate(new Date().toISOString().split('T')[0]) }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">{t('scrumNoEntries')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-white shadow rounded-lg p-4">
                {editingId === note.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('scrumDate')}</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving || !editContent.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? t('saving') : t('scrumSave')}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditContent(''); setEditDate('') }}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-900">{formatDate(note.date)}</h3>
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {t('scrumEdit')}
                      </button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ScrumPage.tsx
git commit -m "feat: add ScrumPage for scrum-of-scrums notes"
```

---

## Task 7: Frontend — Routing and navigation

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Add imports and routes in `App.tsx`**

In `frontend/src/App.tsx`, add imports after the existing page imports (after line 9):

```typescript
import ImportantPage from './pages/ImportantPage'
import ScrumPage from './pages/ScrumPage'
```

Add routes after the `/daily` route block (after line 96, before the `/employees/:id` route):

```tsx
<Route
  path="/important"
  element={
    <ProtectedRoute>
      <ImportantPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/scrum"
  element={
    <ProtectedRoute>
      <ScrumPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 2: Add navigation buttons in `HomePage.tsx`**

In `frontend/src/pages/HomePage.tsx`, in the button group (around line 123-131), add two buttons after the "Daily" button and before the "Add Employee" button:

```tsx
<button
  onClick={() => navigate('/important')}
  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200"
>
  {t('important')}
</button>
<button
  onClick={() => navigate('/scrum')}
  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200"
>
  {t('scrum')}
</button>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/HomePage.tsx
git commit -m "feat: add routing and navigation for Important and Scrum pages"
```

---

## Task 8: Rebuild and verify

- [ ] **Step 1: Rebuild containers**

```bash
docker-compose down && docker-compose up --build -d
```

- [ ] **Step 2: Verify database migration ran**

```bash
docker exec 1on1-backend sqlite3 /app/var/data/app.db "PRAGMA table_info(agenda_items)" | grep is_important
docker exec 1on1-backend sqlite3 /app/var/data/app.db "PRAGMA table_info(scrum_notes)"
```

Expected: `is_important` column visible in agenda_items, full schema of scrum_notes table.

- [ ] **Step 3: Manual smoke test**

1. Open `http://localhost:3000`, verify "Important", "Scrum of Scrums" buttons appear next to "Daily"
2. Go to an employee page, verify star icons on agenda items
3. Mark an item as important, navigate to Important page, verify it appears
4. Unmark from Important page, verify it disappears
5. Go to Scrum page, create a new entry, verify it shows
6. Edit the entry, verify changes persist

- [ ] **Step 4: Commit any fixes if needed**
