#!/bin/bash

# Скрипт для восстановления базы данных из backup'а

BACKUP_DIR="./backups"
DB_PATH="./data/app.db"

# Показать доступные backup'ы
echo "Available backups:"
echo ""
ls -lh "$BACKUP_DIR"/1on1_backup_*.db.gz 2>/dev/null | nl

# Проверка наличия backup'ов
if [ ! "$(ls -A "$BACKUP_DIR"/1on1_backup_*.db.gz 2>/dev/null)" ]; then
    echo "No backups found in $BACKUP_DIR"
    exit 1
fi

echo ""
read -p "Enter backup number to restore (or 'q' to quit): " backup_num

if [ "$backup_num" = "q" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Получить имя файла по номеру
backup_file=$(ls "$BACKUP_DIR"/1on1_backup_*.db.gz 2>/dev/null | sed -n "${backup_num}p")

if [ -z "$backup_file" ]; then
    echo "Error: Invalid backup number"
    exit 1
fi

echo ""
echo "Selected backup: $backup_file"
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Создать backup текущей БД
if [ -f "$DB_PATH" ]; then
    echo "Creating backup of current database..."
    cp "$DB_PATH" "$DB_PATH.before_restore_$(date +"%Y%m%d_%H%M%S")"
fi

# Распаковать и восстановить
echo "Restoring database from $backup_file..."
gunzip -c "$backup_file" > "$DB_PATH"

if [ $? -eq 0 ]; then
    echo "Database restored successfully!"
    echo "You may need to restart the application: docker-compose restart"
else
    echo "Error: Restore failed"
    exit 1
fi
