FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    nginx \
    supervisor \
    sqlite \
    sqlite-dev \
    $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_sqlite \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy composer files first for caching
COPY composer.json composer.lock* ./

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Copy application
COPY . .

# Run composer scripts after copying all files
RUN composer dump-autoload --optimize

# Create directories
RUN mkdir -p var/cache var/log var/data \
    && chown -R www-data:www-data var

# Nginx config
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

# PHP config
RUN echo "memory_limit=256M" > /usr/local/etc/php/conf.d/memory.ini

# Make init script executable
RUN chmod +x bin/init-db.php bin/console

EXPOSE 80

# Entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
