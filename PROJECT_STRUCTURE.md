# 🗂️ СТРУКТУРА ПРОЕКТА

Полная структура всех файлов и папок проекта Froyle MVP.

```
froyle-mvp/
│
├── 📁 src/
│   ├── 📁 components/              (5 компонентов)
│   │   ├── 📄 Header.jsx           - Навигация, логотип, язык
│   │   ├── 📄 Footer.jsx           - Подвал, контакты, ссылки
│   │   ├── 📄 ServiceCard.jsx      - Карточка услуги
│   │   └── 📄 UserCard.jsx         - Профиль пользователя
│   │
│   ├── 📁 pages/                   (3 страницы + конфиги)
│   │   ├── 📄 index.jsx            - Главная страница (/)
│   │   ├── 📄 dashboard.jsx        - Личный кабинет (/dashboard)
│   │   ├── 📄 admin.jsx            - Админ-панель (/admin)
│   │   ├── 📄 _app.jsx             - App wrapper (Next.js конфиг)
│   │   └── 📄 _document.jsx        - HTML документ (Next.js конфиг)
│   │
│   ├── 📁 styles/                  (Глобальные стили)
│   │   └── 📄 globals.css          - TailwindCSS, компоненты, утилиты
│   │
│   ├── 📁 utils/                   (Утилиты и API)
│   │   └── 📄 api.js               - Mock API функции
│   │
│   └── 📁 assets/                  (Пустая папка для изображений)
│       └── (используйте /public вместо этого)
│
├── 📁 public/                      (Статические файлы)
│   └── (добавьте сюда изображения)
│
├── 🔧 КОНФИГУРАЦИОННЫЕ ФАЙЛЫ
│   ├── 📄 package.json             - Зависимости проекта
│   ├── 📄 next.config.js           - Конфигурация Next.js
│   ├── 📄 tailwind.config.js       - Конфигурация TailwindCSS
│   ├── 📄 postcss.config.js        - PostCSS плагины
│   └── 📄 .eslintrc.json          - ESLint конфигурация
│
├── 📄 .env.example                 - Пример переменных окружения
├── 📄 .gitignore                   - Игнорируемые файлы Git
├── 📄 .editorconfig               - Конфигурация редактора
│
└── 📚 ДОКУМЕНТАЦИЯ (8 файлов)
    ├── 📄 README.md                - Основная информация
    ├── 📄 PROJECT_SUMMARY.md       - Этот файл (краткий обзор)
    ├── 📄 GETTING_STARTED.md       - Быстрый старт
    ├── 📄 COMPONENTS.md            - Документация компонентов
    ├── 📄 API.md                   - Документация API функций
    ├── 📄 STYLES.md                - Документация стилей
    ├── 📄 EXAMPLES.md              - Практические примеры
    ├── 📄 DEPLOYMENT.md            - Развертывание
    └── 📄 FAQ.md                   - Часто задаваемые вопросы
```

---

## 📊 Статистика проекта

### Файлы по типам

| Тип | Количество | Размер |
|-----|-----------|--------|
| JSX/JS файлы | 14 | ~25 KB |
| CSS файлы | 1 | ~2 KB |
| JSON | 2 | ~1 KB |
| Markdown docs | 9 | ~120 KB |
| **ВСЕГО** | **26** | ~150 KB |

### Структура папок

```
src/
├── components/    6 файлов
├── pages/         6 файлов
├── styles/        1 файл
├── utils/         1 файл
└── assets/        (пусто)

Конфиг:           5 файлов
Документация:     9 файлов
Всего:            28 файлов
```

---

## 🎯 Назначение каждой папки

### `/src/components/`
Переиспользуемые React компоненты (UI бронирования удалён):
- **Header** - навигация
- **Footer** - подвал
- **ServiceCard** - карточка услуги
- **UserCard** - профиль пользователя

### `/src/pages/`
Next.js страницы (автоматически создают маршруты):
- `index.jsx` → URL: `/`
- `booking.jsx` → URL: `/booking`
- `dashboard.jsx` → URL: `/dashboard`
- `admin.jsx` → URL: `/admin`

### `/src/styles/`
Глобальные CSS стили:
- TailwindCSS директивы
- Custom компоненты (@layer components)
- Глобальные утилиты

### `/src/utils/`
Вспомогательные функции:
- Mock API функции
- Утилиты
- Хелперы

### `/public/`
Статические файлы (доступны напрямую):
- Изображения
- Иконки
- Фавиконы
- Документы

---

## 🔗 Связи между файлами

```
pages/index.jsx
├── imports: Header, Footer, ServiceCard
├── uses: fetchServices() from api.js
└── renders: List of services

pages/booking.jsx (removed)
├── Примечание: страница `/booking` и связанные UI-компоненты (календарь/форма) удалены из шаблона — используйте Supabase или внешний backend для приёма заявок. Mock API функций для бронирований сохранён в `utils/api.js`.

pages/dashboard.jsx
├── imports: Header, Footer, UserCard
├── uses: fetchUserProfile(), fetchUserBookings()
└── renders: User profile and bookings

pages/admin.jsx
├── imports: Header, Footer
├── uses: fetchAdminStats(), fetchUserBookings()
└── renders: Admin statistics and management

components/Header.jsx
├── imports: Link from next/link
└── used by: All pages

components/Footer.jsx
├── imports: Link from next/link
└── used by: All pages

components/ServiceCard.jsx
└── used by: pages/index.jsx

components/Calendar.jsx (removed)
└── used by: pages/booking.jsx

components/BookingForm.jsx
├── uses: createBooking() from api.js
└── used by: pages/booking.jsx

components/UserCard.jsx
└── used by: pages/dashboard.jsx

utils/api.js
├── Mock functions for: services, bookings, users, admin
└── used by: Various components and pages

styles/globals.css
├── TailwindCSS base, components, utilities
└── imported by: pages/_app.jsx
```

---

## 📝 Имена файлов и соглашения

### Компоненты
- **Формат**: `PascalCase.jsx`
- **Пример**: `ServiceCard.jsx`, `BookingForm.jsx`
- **Расположение**: `/src/components/`

### Страницы
- **Формат**: `lowercase.jsx` или `PascalCase.jsx`
- **Пример**: `index.jsx`, `booking.jsx`
- **Расположение**: `/src/pages/`
- **Special**: `_app.jsx`, `_document.jsx`

### Утилиты
- **Формат**: `lowercase.js`
- **Пример**: `api.js`
- **Расположение**: `/src/utils/`

### Стили
- **Формат**: `lowercase.css`
- **Пример**: `globals.css`
- **Расположение**: `/src/styles/`

---

## 🚀 Как добавить новый элемент

### Добавить новый компонент

1. Создайте файл:
```bash
src/components/MyComponent.jsx
```

2. Напишите компонент:
```jsx
export default function MyComponent({ prop }) {
  return <div className="card">{prop}</div>;
}
```

3. Используйте в страницах:
```jsx
import MyComponent from '@/components/MyComponent';
```

### Добавить новую страницу

1. Создайте файл:
```bash
src/pages/my-page.jsx
```

2. Напишите страницу:
```jsx
export default function MyPage() {
  return <div>Content</div>;
}
```

3. Доступна по URL: `/my-page`

### Добавить новую API функцию

1. В файл `/src/utils/api.js` добавьте:
```javascript
export async function fetchMyData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: 'something' });
    }, 500);
  });
}
```

2. Используйте в компонентах:
```javascript
import { fetchMyData } from '@/utils/api';

const data = await fetchMyData();
```

---

## 📦 Зависимости по файлам

### package.json зависит от
- `next` - Next.js фреймворк
- `react` & `react-dom` - React библиотека

### tailwind.config.js зависит от
- `tailwindcss` - CSS фреймворк
- путей к jsx/js файлам для сканирования

### postcss.config.js зависит от
- `tailwindcss` - CSS обработка
- `autoprefixer` - Префиксы

### .eslintrc.json зависит от
- `eslint` - Linter
- `eslint-config-next` - Next.js правила

---

## 🔍 Поиск файлов

### По функции
- **Навигация**: `Header.jsx`
- **Подвал**: `Footer.jsx`
- **Карточки услуг**: `ServiceCard.jsx`
- **Календарь**: (удалён, используйте Supabase/внешний backend)
- **Формы**: `BookingForm.jsx`
- **Профили**: `UserCard.jsx`

### По странице
- **Главная**: `pages/index.jsx`
- **Запись**: `pages/booking.jsx`
- **Кабинет**: `pages/dashboard.jsx`
- **Админ**: `pages/admin.jsx`

### По типу
- **Компоненты**: `src/components/*.jsx` (6 файлов)
- **Страницы**: `src/pages/*.jsx` (6 файлов)
- **API**: `src/utils/api.js`
- **Стили**: `src/styles/globals.css`

---

## 💾 Сохранение файлов

### Коммитить в Git
```bash
git add .
git commit -m "Initial project setup"
git push origin main
```

### НЕ коммитить
```
node_modules/
.next/
.env.local
.DS_Store
*.log
```

---

## 📊 Разбор по размеру

| Категория | Размер | Процент |
|-----------|--------|---------|
| Документация | ~120 KB | 80% |
| Код JS/JSX | ~25 KB | 17% |
| Конфиги | ~5 KB | 3% |
| **Всего** | **~150 KB** | **100%** |

---

## ✅ Чек-лист файлов

- [x] Все компоненты созданы (6)
- [x] Все страницы созданы (4)
- [x] Конфигурация Next.js
- [x] Конфигурация TailwindCSS
- [x] Глобальные стили
- [x] API функции (9)
- [x] package.json с зависимостями
- [x] .gitignore
- [x] .env.example
- [x] Полная документация (9 файлов)

---

## 🎓 Дальнейшее развитие

### Добавить позже
- [ ] `/public/` папка с изображениями
- [ ] `/tests/` папка с тестами
- [ ] `/api/` папка для backend маршрутов
- [ ] `/hooks/` папка для custom hooks
- [ ] `/contexts/` папка для React Context
- [ ] `/types/` папка для TypeScript типов

### Структура после расширения
```
src/
├── api/           (Backend маршруты)
├── components/    (UI компоненты)
├── pages/         (Страницы)
├── styles/        (Стили)
├── utils/         (Утилиты)
├── hooks/         (Custom hooks)
├── contexts/      (React Context)
└── types/         (TypeScript типы)
```

---

## 📞 Ссылки на документацию

- 📄 [README.md](./README.md) - Полная информация
- 📄 [GETTING_STARTED.md](./GETTING_STARTED.md) - Быстрый старт
- 📄 [COMPONENTS.md](./COMPONENTS.md) - Компоненты
- 📄 [API.md](./API.md) - API функции
- 📄 [STYLES.md](./STYLES.md) - Стили
- 📄 [EXAMPLES.md](./EXAMPLES.md) - Примеры
- 📄 [DEPLOYMENT.md](./DEPLOYMENT.md) - Развертывание
- 📄 [FAQ.md](./FAQ.md) - Вопросы

---

**Проект готов!** Начните с:
```bash
npm install && npm run dev
```
