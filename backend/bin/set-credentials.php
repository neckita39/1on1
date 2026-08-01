#!/usr/bin/env php
<?php
// Смена доступов приложения: логин (email) и пароль.
// Пароль читается из stdin, чтобы не попадать в историю команд и в список процессов.
//
// Использование:
//   docker exec -i 1on1-backend php /app/bin/set-credentials.php me@example.com <<< 'пароль'
//   php backend/bin/set-credentials.php --db data/app.db me@example.com <<< 'пароль'
//
// Пустой логин (--no-login) убирает проверку email — вход только по паролю.

$options = getopt('', ['db:', 'no-login']);
$dbPath = $options['db'] ?? (getenv('DB_PATH') ?: '/app/var/data/app.db');

$args = array_values(array_filter($argv, static function (string $a, int $i): bool {
    return $i > 0 && !str_starts_with($a, '--');
}, ARRAY_FILTER_USE_BOTH));

$login = isset($options['no-login']) ? null : ($args[0] ?? null);

if ($login === null && !isset($options['no-login'])) {
    fwrite(STDERR, "Укажите логин (email) или флаг --no-login\n");
    exit(1);
}

$password = trim((string)stream_get_contents(STDIN));

if (strlen($password) < 12) {
    fwrite(STDERR, "Пароль должен быть не короче 12 символов (получено: " . strlen($password) . ")\n");
    exit(1);
}

$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys = ON');

$pdo->prepare('UPDATE settings SET password_hash = ?, login = ? WHERE id = 1')
    ->execute([password_hash($password, PASSWORD_DEFAULT), $login]);

printf("Доступы обновлены: логин %s, пароль (%d символов) захэширован\n", $login ?? '— не требуется —', strlen($password));
