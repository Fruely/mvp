# 📦 Развертывание (Deployment)

Полное руководство по развертыванию проекта Freuly MVP на различные платформы.

## 📋 Содержание

1. [Подготовка к развертыванию](#подготовка-к-развертыванию)
2. [Vercel (рекомендуется)](#vercel-рекомендуется)
3. [Netlify](#netlify)
4. [Docker](#docker)
5. [Traditional Server](#traditional-server)
6. [Environment Variables](#environment-variables)
7. [Performance Optimization](#performance-optimization)

---

## 🔧 Подготовка к развертыванию

### 1. Проверка перед деплоем

```bash
# Проверить код
npm run lint

# Сбилдить проект
npm run build

# Проверить сборку
npm start
```

### 2. Обновить версию

```json
{
  "version": "0.1.0"  // Обновите на нужную версию
}
```

### 3. Убедиться в .gitignore

```bash
node_modules/
.next/
.env.local
.env.*.local
```

### 4. Создать environment переменные

```bash
cp .env.example .env.local
# Отредактировать .env.local с вашими значениями
```

---

## ☁️ Vercel (рекомендуется)

**Самый простой способ развернуть Next.js проект!**

### Вариант 1: GUI (Через веб-интерфейс)

1. Перейти на [vercel.com](https://vercel.com)
2. Нажать "Sign Up" и создать аккаунт
3. Авторизоваться
4. Нажать "New Project"
5. Выбрать репозиторий GitHub (если проект там)
6. Нажать "Import"
7. Vercel автоматически определит Next.js
8. Нажать "Deploy"

### Вариант 2: CLI (Через терминал)

```bash
# 1. Установить Vercel CLI
npm install -g vercel

# 2. Авторизоваться
vercel login

# 3. Развернуть проект
vercel

# 4. Следовать инструкциям в терминале
```

### Вариант 3: GitHub Actions (Автоматический деплой)

1. Создать `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Vercel Settings

1. Перейти в проект на Vercel
2. Settings → Environment Variables
3. Добавить переменные из `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_API_TOKEN=your_admin_token
```

**Преимущества**:
- ✅ Автоматический деплой
- ✅ SSL сертификат
- ✅ CDN глобально
- ✅ Serverless functions
- ✅ Бесплатный tier

---

## 🌐 Netlify

### 1. Подготовить проект

```bash
npm run build
```

### 2. Создать netlify.toml

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  NODE_VERSION = "20.0.0"
  NODE_ENV = "production"
```

### 3. Развернуть

**Через веб-интерфейс**:
1. Перейти на [netlify.com](https://netlify.com)
2. Sign Up и авторизоваться
3. "Add new site" → "Import an existing project"
4. Выбрать GitHub репозиторий
5. Netlify автоматически найдет конфиг
6. Нажать "Deploy"

**Через CLI**:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Преимущества**:
- ✅ Простой деплой
- ✅ Встроенная формы
- ✅ Функции без сервера
- ✅ Бесплатный tier

---

## 🐳 Docker

### 1. Создать Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
```

### 2. Создать .dockerignore

```
node_modules
npm-debug.log
.next
.git
.gitignore
README.md
```

### 3. Собрать и запустить Docker образ

```bash
# Сбилдить образ
docker build -t froyle-mvp .

# Запустить контейнер
docker run -p 3000:3000 froyle-mvp

# Запустить с environment переменными
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  froyle-mvp
```

### 4. Развернуть на Docker регистр

```bash
# Логин в Docker Hub
docker login

# Тег образа
docker tag froyle-mvp yourusername/froyle-mvp:latest

# Push
docker push yourusername/froyle-mvp:latest
```

### 5. Развернуть на сервисе (DigitalOcean, AWS, Google Cloud)

```bash
# Пример для DigitalOcean App Platform
# Просто push на Docker Hub и выбрать образ в панели управления
```

---

## 🖥️ Traditional Server

### Вариант 1: DigitalOcean Droplet

```bash
# 1. SSH в Droplet
ssh root@your_droplet_ip

# 2. Обновить систему
apt update && apt upgrade -y

# 3. Установить Node.js (LTS 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# 4. Установить PM2
npm install -g pm2

# 5. Клонировать репозиторий
cd /var/www
git clone your_repo_url froyle-mvp
cd froyle-mvp

# 6. Установить зависимости
npm install --production

# 7. Создать .env файл
cp .env.example .env
# Отредактировать .env

# 8. Сбилдить проект
npm run build

# 9. Запустить с PM2
pm2 start npm --name "froyle-mvp" -- start

# 10. Сохранить PM2 конфиг
pm2 startup
pm2 save
```

### Вариант 2: Nginx как reverse proxy

```nginx
# /etc/nginx/sites-available/froyle-mvp

server {
    listen 80;
    server_name froyle.com www.froyle.com;

    # Редирект с HTTP на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name froyle.com www.froyle.com;

    ssl_certificate /etc/letsencrypt/live/froyle.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/froyle.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Вариант 3: SSL с Let's Encrypt

```bash
# Установить Certbot
sudo apt install certbot python3-certbot-nginx

# Получить сертификат
sudo certbot certonly --nginx -d froyle.com -d www.froyle.com

# Автоматическое обновление
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🔐 Environment Variables

### На Vercel

1. Project Settings → Environment Variables
2. Добавить переменные:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_API_TOKEN=your_admin_token
TERMS_VERSION=1.0
```

### На сервере

```bash
# Создать .env файл
nano /var/www/froyle-mvp/.env

# Содержимое:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_API_TOKEN=your_admin_token
NODE_ENV=production
```

### Секретные переменные

```bash
# Генерировать NEXTAUTH_SECRET
openssl rand -base64 32

# Генерировать другие ключи
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 Performance Optimization

### 1. Image Optimization

```jsx
import Image from 'next/image';

<Image
  src="/images/service.jpg"
  alt="Service"
  width={400}
  height={300}
  quality={75}
/>
```

### 2. Code Splitting

```jsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <div>Загрузка компонента...</div>,
});
```

### 3. API Optimization

```jsx
// Использовать ISR (Incremental Static Regeneration)
export async function getStaticProps() {
  const services = await fetchServices();
  return {
    props: { services },
    revalidate: 60, // Переvalidate каждые 60 секунд
  };
}
```

### 4. Bundle Analysis

```bash
npm install --save-dev @next/bundle-analyzer

# Добавить в next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({});

# Анализировать
ANALYZE=true npm run build
```

---

## 🧪 Pre-deployment Checklist

- [ ] Протестировать функциональность локально
- [ ] Запустить `npm run lint`
- [ ] Запустить `npm run build`
- [ ] Проверить `.env.example` файл
- [ ] Обновить версию в `package.json`
- [ ] Проверить `.gitignore`
- [ ] Удалить console.log и debug код
- [ ] Обновить `README.md`
- [ ] Создать commit и push
- [ ] Запустить тесты (если есть)
- [ ] Проверить performance (Lighthouse)
- [ ] Настроить monitoring (Sentry, etc.)

---

## 📊 Monitoring

### Sentry для ошибок

```bash
npm install @sentry/nextjs
```

```javascript
// next.config.js
const withSentry = require("@sentry/nextjs");

module.exports = withSentry({
  // ... ваш конфиг
});
```

### Google Analytics

```jsx
// pages/_app.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      window.gtag?.pageview({
        page_path: url,
        page_title: document.title,
      });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events]);

  return <Component {...pageProps} />;
}
```

---

## 🆘 Troubleshooting

### Проблема: Build fails на Vercel

**Решение**:
```bash
# Проверить локально
npm run build

# Убедиться что все зависимости установлены
npm install

# Проверить переменные окружения
echo $NEXT_PUBLIC_SUPABASE_URL
```

### Проблема: Медленная загрузка

**Решение**:
1. Анализировать bundle: `ANALYZE=true npm run build`
2. Использовать dynamic imports
3. Оптимизировать изображения
4. Включить caching

### Проблема: CORS ошибки

**Решение**:
```javascript
// next.config.js
module.exports = {
  headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};
```

---

## 📞 Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Netlify Documentation](https://docs.netlify.com/)
- [Docker Documentation](https://docs.docker.com/)

---

**Готовы к деплою?** Выберите платформу и следуйте инструкциям! 🚀
