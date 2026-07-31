#!/usr/bin/env php
<?php

$dbPath = '/app/var/data/demo.db';
$dbDir = dirname($dbPath);

if (!is_dir($dbDir)) {
    mkdir($dbDir, 0777, true);
}

// Remove existing demo DB to start fresh
if (file_exists($dbPath)) {
    unlink($dbPath);
}

$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Create schema
$pdo->exec("
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        password_hash VARCHAR(255),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(255),
        bio TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date DATETIME NOT NULL,
        notes TEXT NOT NULL,
        discussed_topics TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agenda_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        content VARCHAR(500) NOT NULL,
        is_discussed INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(20) NOT NULL DEFAULT 'note',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
");

// Initialize settings with demo password: "demo12345678" (12 chars minimum)
$passwordHash = password_hash('demo12345678', PASSWORD_DEFAULT);
$pdo->exec("INSERT INTO settings (id, password_hash, created_at) VALUES (1, '$passwordHash', datetime('now'))");

// Generate demo employees
$employees = [
    [
        'name' => 'Алексей Смирнов',
        'position' => 'Senior Backend Developer',
        'bio' => 'Москва. Женат, 2 детей. Увлекается горными лыжами и фотографией. В команде 3 года.'
    ],
    [
        'name' => 'Мария Иванова',
        'position' => 'Frontend Developer',
        'bio' => 'Санкт-Петербург. Не замужем. Любит йогу и путешествия. Недавно вернулась из поездки в Японию.'
    ],
    [
        'name' => 'Дмитрий Петров',
        'position' => 'QA Engineer',
        'bio' => 'Новосибирск. Холост. Играет в киберспорте (CS2). Мечтает о собаке.'
    ],
    [
        'name' => 'Екатерина Козлова',
        'position' => 'UI/UX Designer',
        'bio' => 'Казань. Замужем. Рисует акварелью, ведет блог об искусстве. Вегетарианка.'
    ],
    [
        'name' => 'Сергей Волков',
        'position' => 'DevOps Engineer',
        'bio' => 'Екатеринбург. Женат, ждет первого ребенка. Увлекается автомобилями и мотоциклами.'
    ],
    [
        'name' => 'Анна Соколова',
        'position' => 'Junior Backend Developer',
        'bio' => 'Москва. Не замужем. Учится параллельно с работой (магистратура). Любит кошек, есть 2 кота.'
    ],
];

$employeeIds = [];
foreach ($employees as $emp) {
    $stmt = $pdo->prepare("INSERT INTO employees (name, position, bio, created_at) VALUES (?, ?, ?, datetime('now'))");
    $stmt->execute([$emp['name'], $emp['position'], $emp['bio']]);
    $employeeIds[] = $pdo->lastInsertId();
}

// Generate demo meetings with realistic dates
$meetingsData = [
    // Алексей Смирнов (id=1)
    [
        'employee_id' => 1,
        'date' => date('Y-m-d H:i:s', strtotime('-14 days')),
        'notes' => "Обсудили текущий спринт. Алексей хорошо справляется с задачами по оптимизации API. Планирует взять отпуск в феврале для поездки на горнолыжный курорт.\n\nДоговорились:\n- Подготовить документацию по новым эндпоинтам\n- Провести ревью кода у Анны (менторство)",
        'discussed_topics' => '["Подготовить документацию API", "Отпуск в феврале"]'
    ],
    [
        'employee_id' => 1,
        'date' => date('Y-m-d H:i:s', strtotime('-42 days')),
        'notes' => "Алексей поделился идеями по улучшению архитектуры. Предложил ввести кэширование на уровне БД.\n\nОбсудили карьерный рост - интересуется позицией тимлида.",
        'discussed_topics' => '["Архитектура и кэширование"]'
    ],

    // Мария Иванова (id=2)
    [
        'employee_id' => 2,
        'date' => date('Y-m-d H:i:s', strtotime('-7 days')),
        'notes' => "Мария вернулась из отпуска в Японии, делилась впечатлениями. Обсудили новый дизайн компонентов и интеграцию с backend.\n\nПланы:\n- Рефакторинг формы авторизации\n- Изучить Tailwind v4",
        'discussed_topics' => '["Tailwind CSS", "Рефакторинг форм"]'
    ],

    // Дмитрий Петров (id=3)
    [
        'employee_id' => 3,
        'date' => date('Y-m-d H:i:s', strtotime('-10 days')),
        'notes' => "Дмитрий рассказал о найденных багах в production. Обсудили процесс тестирования перед релизом.\n\nПроблемы:\n- Нехватка времени на регресс\n- Нужно больше автотестов\n\nРешение: выделить 20% времени на автоматизацию",
        'discussed_topics' => '["Баги в production", "Нехватка времени на тестирование"]'
    ],

    // Екатерина Козлова (id=4)
    [
        'employee_id' => 4,
        'date' => date('Y-m-d H:i:s', strtotime('-21 days')),
        'notes' => "Екатерина показала новые макеты для мобильной версии. Отличная работа!\n\nОбсудили:\n- Адаптивность для планшетов\n- Dark mode\n\nКатя предложила провести UX-исследование с пользователями.",
        'discussed_topics' => '["Новый дизайн mobile", "Dark mode", "UX-исследование"]'
    ],

    // Сергей Волков (id=5)
    [
        'employee_id' => 5,
        'date' => date('Y-m-d H:i:s', strtotime('-5 days')),
        'notes' => "Сергей настроил CI/CD pipeline для автоматического деплоя. Молодец!\n\nТакже обсудили:\n- Скоро будет декретный отпуск жены, возможны перерывы\n- Интересуется Kubernetes, планирует сертификацию\n\nПоддерживаем инициативу по обучению.",
        'discussed_topics' => '["CI/CD настройка", "Декрет жены", "Kubernetes сертификация"]'
    ],
];

foreach ($meetingsData as $meeting) {
    $stmt = $pdo->prepare("INSERT INTO meetings (employee_id, date, notes, discussed_topics, created_at) VALUES (?, ?, ?, ?, datetime('now'))");
    $stmt->execute([
        $meeting['employee_id'],
        $meeting['date'],
        $meeting['notes'],
        $meeting['discussed_topics']
    ]);
}

// Generate agenda items
$agendaData = [
    // Алексей Смирнов
    ['employee_id' => 1, 'content' => 'Подготовить документацию API', 'category' => 'note', 'sort_order' => 1],
    ['employee_id' => 1, 'content' => 'Отпуск в феврале (10-20 февраля)', 'category' => 'note', 'sort_order' => 2],
    ['employee_id' => 1, 'content' => 'Карьерный рост: обсудить переход в тимлиды', 'category' => 'positive', 'sort_order' => 3],

    // Мария Иванова
    ['employee_id' => 2, 'content' => 'Tailwind CSS v4', 'category' => 'note', 'sort_order' => 1, 'is_discussed' => 1],
    ['employee_id' => 2, 'content' => 'Рефакторинг форм', 'category' => 'note', 'sort_order' => 2, 'is_discussed' => 1],
    ['employee_id' => 2, 'content' => 'Проблемы с TypeScript типами в API клиенте', 'category' => 'problem', 'sort_order' => 3],
    ['employee_id' => 2, 'content' => 'Отлично справилась с React 18 миграцией!', 'category' => 'positive', 'sort_order' => 4],

    // Дмитрий Петров
    ['employee_id' => 3, 'content' => 'Баги в production', 'category' => 'problem', 'sort_order' => 1, 'is_discussed' => 1],
    ['employee_id' => 3, 'content' => 'Нехватка времени на тестирование', 'category' => 'warning', 'sort_order' => 2, 'is_discussed' => 1],
    ['employee_id' => 3, 'content' => 'План автоматизации тестов (20% времени)', 'category' => 'note', 'sort_order' => 3],
    ['employee_id' => 3, 'content' => 'Хочет завести собаку - может нужен гибкий график?', 'category' => 'note', 'sort_order' => 4],

    // Екатерина Козлова
    ['employee_id' => 4, 'content' => 'Новый дизайн mobile', 'category' => 'positive', 'sort_order' => 1, 'is_discussed' => 1],
    ['employee_id' => 4, 'content' => 'Dark mode', 'category' => 'note', 'sort_order' => 2, 'is_discussed' => 1],
    ['employee_id' => 4, 'content' => 'UX-исследование', 'category' => 'note', 'sort_order' => 3, 'is_discussed' => 1],
    ['employee_id' => 4, 'content' => 'Обновить UI Kit библиотеку', 'category' => 'note', 'sort_order' => 4],

    // Сергей Волков
    ['employee_id' => 5, 'content' => 'CI/CD настройка', 'category' => 'positive', 'sort_order' => 1, 'is_discussed' => 1],
    ['employee_id' => 5, 'content' => 'Декрет жены (может быть недоступен)', 'category' => 'note', 'sort_order' => 2, 'is_discussed' => 1],
    ['employee_id' => 5, 'content' => 'Kubernetes сертификация (поддержать)', 'category' => 'positive', 'sort_order' => 3, 'is_discussed' => 1],
    ['employee_id' => 5, 'content' => 'Настроить мониторинг Prometheus', 'category' => 'note', 'sort_order' => 4],

    // Анна Соколова (Junior)
    ['employee_id' => 6, 'content' => 'Менторство от Алексея (код ревью)', 'category' => 'note', 'sort_order' => 1],
    ['employee_id' => 6, 'content' => 'Учеба в магистратуре - гибкий график', 'category' => 'note', 'sort_order' => 2],
    ['employee_id' => 6, 'content' => 'Отлично разобралась с Doctrine ORM!', 'category' => 'positive', 'sort_order' => 3],
    ['employee_id' => 6, 'content' => 'Неуверенность в своих силах', 'category' => 'warning', 'sort_order' => 4],
    ['employee_id' => 6, 'content' => 'Первая самостоятельная задача - API для экспорта', 'category' => 'note', 'sort_order' => 5],
];

foreach ($agendaData as $item) {
    $isDiscussed = $item['is_discussed'] ?? 0;
    $stmt = $pdo->prepare("INSERT INTO agenda_items (employee_id, content, category, sort_order, is_discussed, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))");
    $stmt->execute([
        $item['employee_id'],
        $item['content'],
        $item['category'],
        $item['sort_order'],
        $isDiscussed
    ]);
}

echo "✅ Demo database created successfully!\n";
echo "📍 Location: $dbPath\n";
echo "👤 Demo password: demo12345678\n";
echo "\n";
echo "📊 Generated:\n";
echo "  - 6 employees\n";
echo "  - 6 meetings\n";
echo "  - 24 agenda items\n";
