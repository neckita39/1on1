#!/bin/sh

# Initialize database
php /app/bin/init-db.php

# Clear cache
php /app/bin/console cache:clear --no-warmup 2>/dev/null || true
php /app/bin/console cache:warmup 2>/dev/null || true

# Fix permissions
chown -R www-data:www-data /app/var

exec "$@"
