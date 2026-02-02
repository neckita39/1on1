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

echo "Database initialized successfully\n";
