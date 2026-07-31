#!/usr/bin/env php
<?php

$dbPath = '/app/var/data/app.db';
$dbDir = dirname($dbPath);

if (!is_dir($dbDir)) {
    mkdir($dbDir, 0777, true);
}

$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

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

// Initialize settings row if not exists
$stmt = $pdo->query("SELECT COUNT(*) FROM settings WHERE id = 1");
if ($stmt->fetchColumn() == 0) {
    $pdo->exec("INSERT INTO settings (id, created_at) VALUES (1, datetime('now'))");
}

// Migration: add discussed_topics column if not exists
$cols = $pdo->query("PRAGMA table_info(meetings)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('discussed_topics', $cols)) {
    $pdo->exec("ALTER TABLE meetings ADD COLUMN discussed_topics TEXT");
}

// Migration: add category and sort_order columns to agenda_items if not exists
$agendaCols = $pdo->query("PRAGMA table_info(agenda_items)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('category', $agendaCols)) {
    $pdo->exec("ALTER TABLE agenda_items ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'note'");
}
if (!in_array('sort_order', $agendaCols)) {
    $pdo->exec("ALTER TABLE agenda_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
    // Set sort_order based on id for existing items
    $pdo->exec("UPDATE agenda_items SET sort_order = id");
}

// Migration: add is_important column to agenda_items if not exists
$agendaCols3 = $pdo->query("PRAGMA table_info(agenda_items)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('is_important', $agendaCols3)) {
    $pdo->exec("ALTER TABLE agenda_items ADD COLUMN is_important INTEGER NOT NULL DEFAULT 0");
}

// Migration: add bio column to employees if not exists
$employeeCols = $pdo->query("PRAGMA table_info(employees)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('bio', $employeeCols)) {
    $pdo->exec("ALTER TABLE employees ADD COLUMN bio TEXT");
}

// Migration: add bitrix_id and avatar_url columns to employees if not exists
$employeeCols2 = $pdo->query("PRAGMA table_info(employees)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('bitrix_id', $employeeCols2)) {
    $pdo->exec("ALTER TABLE employees ADD COLUMN bitrix_id INTEGER");
    $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_bitrix_id ON employees(bitrix_id)");
}
if (!in_array('avatar_url', $employeeCols2)) {
    $pdo->exec("ALTER TABLE employees ADD COLUMN avatar_url VARCHAR(500)");
}

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

// Migration: add mood and duration columns to meetings if not exists
$meetingCols = $pdo->query("PRAGMA table_info(meetings)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('mood', $meetingCols)) {
    $pdo->exec("ALTER TABLE meetings ADD COLUMN mood INTEGER");
}
if (!in_array('duration', $meetingCols)) {
    $pdo->exec("ALTER TABLE meetings ADD COLUMN duration INTEGER");
}

// Migration: add tab column to scrum_notes if not exists
$scrumCols = $pdo->query("PRAGMA table_info(scrum_notes)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('tab', $scrumCols)) {
    $pdo->exec("ALTER TABLE scrum_notes ADD COLUMN tab VARCHAR(20) NOT NULL DEFAULT 'sos'");
}

// Migration: add people column to scrum_notes (JSON array of employee ids)
$scrumCols2 = $pdo->query("PRAGMA table_info(scrum_notes)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('people', $scrumCols2)) {
    $pdo->exec("ALTER TABLE scrum_notes ADD COLUMN people TEXT");
}

// Migration: add name_instr and calendar sync columns to employees
$employeeCols3 = $pdo->query("PRAGMA table_info(employees)")->fetchAll(PDO::FETCH_COLUMN, 1);
if (!in_array('name_instr', $employeeCols3)) {
    $pdo->exec("ALTER TABLE employees ADD COLUMN name_instr VARCHAR(255)");
}
if (!in_array('calendar_event_id', $employeeCols3)) {
    $pdo->exec("ALTER TABLE employees ADD COLUMN calendar_event_id INTEGER");
}
if (!in_array('meeting_rule', $employeeCols3)) {
    $pdo->exec("ALTER TABLE employees ADD COLUMN meeting_rule VARCHAR(255)");
}
if (!in_array('next_meeting_at', $employeeCols3)) {
    $pdo->exec("ALTER TABLE employees ADD COLUMN next_meeting_at DATETIME");
}

echo "Database initialized successfully\n";
