#!/bin/bash

# Скрипт для резервного копирования базы данных 1-on-1

# Настройки
BACKUP_DIR="./backups"
DB_PATH="./data/app.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/1on1_backup_$TIMESTAMP.db"

# Количество дней для хранения backup'ов
RETENTION_DAYS=30

# Создание директории для backup'ов, если её нет
mkdir -p "$BACKUP_DIR"

# Проверка существования БД
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database file not found at $DB_PATH"
    exit 1
fi

# Создание backup'а
echo "Creating backup: $BACKUP_FILE"
cp "$DB_PATH" "$BACKUP_FILE"

# Проверка успешности backup'а
if [ $? -eq 0 ]; then
    # Сжатие backup'а
    gzip "$BACKUP_FILE"
    echo "Backup created successfully: $BACKUP_FILE.gz"

    # Удаление старых backup'ов
    echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "1on1_backup_*.db.gz" -type f -mtime +$RETENTION_DAYS -delete

    # Показать список backup'ов
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/1on1_backup_*.db.gz 2>/dev/null || echo "No backups found"
else
    echo "Error: Backup failed"
    exit 1
fi
