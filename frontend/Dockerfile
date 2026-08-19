FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

# Самоподписанный сертификат для HTTPS-плеча роутер → контейнер
# (роутер не проверяет доверие, важен только шифрованный канал)
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/nginx/certs/1on1.key -out /etc/nginx/certs/1on1.crt \
        -subj "/CN=1on1.callstatic.crazedns.ru" \
        -addext "subjectAltName=DNS:1on1.callstatic.crazedns.ru,IP:192.168.1.95"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
