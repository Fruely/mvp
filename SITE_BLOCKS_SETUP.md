# 🎨 Site Blocks - Система управления визуальным контентом

## ✅ Что уже сделано

### 1. База данных
- ✅ Таблица `site_blocks` создана в Supabase
- ✅ Storage bucket `site-blocks` создан (PUBLIC)
- ✅ RLS политики настроены
- ✅ Дефолтные блоки: `homepage_hero`, `homepage_mosaic`

### 2. API
- ✅ `GET /api/site-blocks` - получить все блоки
- ✅ `POST /api/site-blocks` - обновить блок (с admin_password)
- ✅ `POST /api/site-blocks/upload` - загрузить изображение

## 📋 Что нужно доделать

### 1. Компонент для отображения (SiteBlockRenderer.tsx)
Создайте файл `/components/SiteBlockRenderer.tsx` с кодом из документации `SITE_BLOCKS_README.md`

### 2. Админ панель (app/admin/site-blocks/page.tsx)
Создайте файл `/app/admin/site-blocks/page.tsx` с кодом из документации

### 3. Интеграция на главной
Добавьте в `/app/page.tsx`:
```tsx
import { SiteBlockRenderer } from '@/components/SiteBlockRenderer';

// В JSX:
<SiteBlockRenderer blockKey="homepage_hero" />
```

## 🧪 Тестирование API

```bash
# Получить все блоки
curl https://mvp-si84.vercel.app/api/site-blocks

# Обновить hero блок
curl -X POST https://mvp-si84.vercel.app/api/site-blocks \
  -H "Content-Type: application/json" \
  -d '{
    "admin_password": "Perdipluher",
    "key": "homepage_hero",
    "type": "image",
    "content": {
      "url": "https://your-image-url.jpg",
      "title": "Новый заголовок",
      "subtitle": "Новый подзаголовок",
      "alt": "Hero изображение"
    }
  }'
```

## 📁 Файлы в репозитории

- ✅ `app/api/site-blocks/route.ts` - API endpoints
- ✅ `app/api/site-blocks/upload/route.ts` - upload handler
- ✅ `supabase/migrations/create_site_blocks.sql` - SQL миграция
- ⏳ `components/SiteBlockRenderer.tsx` - нужно создать
- ⏳ `app/admin/site-blocks/page.tsx` - нужно создать

## 🔗 Ссылки

- Полная документация: `SITE_BLOCKS_README.md`
- Админ панель (после создания): https://mvp-si84.vercel.app/admin/site-blocks

## ⚠️ Важно

Функция ПОЛНОСТЬЮ ИЗОЛИРОВАНА от specialists/leads/approvals. Можно удалить без последствий.
