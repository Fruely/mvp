# ❓ FAQ (Часто задаваемые вопросы)

Ответы на самые частые вопросы о проекте Froyle MVP.

## 📚 Содержание

1. [Общие вопросы](#общие-вопросы)
2. [Установка и запуск](#установка-и-запуск)
3. [Разработка](#разработка)
4. [Компоненты](#компоненты)
5. [API](#api)
6. [Стили и дизайн](#стили-и-дизайн)
7. [Развертывание](#развертывание)
8. [Проблемы и решения](#проблемы-и-решения)

---

## 🎯 Общие вопросы

### Q: Что такое Froyle MVP?

**A**: Froyle MVP - это полный скаффолд (каркас) проекта Next.js + TailwindCSS для платформы бронирования услуг здоровья и благополучия (массаж, йога, фитнес, консультации).

Проект содержит:
- Готовые компоненты
- Макеты страниц
- Mock API функции
- Полную документацию

---

### Q: Какую лицензию использует проект?

**A**: Проект создан как open-source MVP для демонстрации. Вы можете использовать, модифицировать и распространять его свободно.

---

### Q: На каком стеке создан проект?

**A**: 
- **Frontend**: Next.js 14, React 18
- **Стили**: TailwindCSS 3
- **JavaScript**: ES6+
- **Процессинг**: PostCSS, Autoprefixer

---

### Q: Есть ли backend в проекте?

**A**: Нет, в проекте только frontend. Все API функции - это mock функции. Вы должны интегрировать реальный backend/API для production.

---

## 🔧 Установка и запуск

### Q: Как установить проект?

**A**:
```bash
# 1. Клонировать репозиторий
git clone <url> froyle-mvp
cd froyle-mvp

# 2. Установить зависимости
npm install

# 3. Запустить в режиме разработки
npm run dev

# 4. Открыть в браузере
http://localhost:3000
```

---

### Q: Какие системные требования?

**A**:
- Node.js 16+ (рекомендуется 18+)
- npm 8+ или yarn/pnpm
- 1GB свободного места на диске
- Любой современный браузер

---

### Q: Порт 3000 уже занят. Что делать?

**A**:
```bash
# Запустить на другом порту
npm run dev -- -p 3001

# Или завершить процесс на порту 3000
lsof -i :3000  # Узнать PID
kill -9 <PID>   # Завершить процесс
```

---

### Q: Как установить зависимости для yarn?

**A**:
```bash
# Удалить npm зависимости
rm -rf node_modules package-lock.json

# Установить yarn (если не установлен)
npm install -g yarn

# Установить зависимости через yarn
yarn install

# Запустить проект
yarn dev
```

---

## 💻 Разработка

### Q: Как добавить новый компонент?

**A**:
1. Создайте файл в `/src/components/MyComponent.jsx`
2. Напишите компонент:

```jsx
export default function MyComponent({ title, children }) {
  return (
    <div className="card">
      <h2 className="text-xl font-bold text-primary">{title}</h2>
      {children}
    </div>
  );
}
```

3. Используйте в странице:

```jsx
import MyComponent from '@/components/MyComponent';

export default function Page() {
  return <MyComponent title="Hello">Content</MyComponent>;
}
```

---

### Q: Как создать новую страницу?

**A**:
1. Создайте файл в `/src/pages/my-page.jsx`
2. Напишите код:

```jsx
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function MyPage() {
  return (
    <div>
      <Header />
      <main>Содержимое страницы</main>
      <Footer />
    </div>
  );
}
```

3. Страница будет доступна по URL: `/my-page`

---

### Q: Где находятся изображения и ресурсы?

**A**: Создайте папку `/public` в корне проекта для статических файлов:

```
public/
├── images/
│   ├── logo.png
│   ├── services/
│   └── ...
├── icons/
└── ...
```

Используйте в компонентах:

```jsx
<img src="/images/logo.png" alt="Logo" />
```

---

## 🎨 Компоненты

### Q: Как использовать Header в компоненте?

**A**:
```jsx
import Header from '@/components/Header';

export default function Page() {
  return (
    <>
      <Header />
      <main>Содержимое</main>
    </>
  );
}
```

Header не требует props и автоматически управляет навигацией.

---

### Q: Как передать данные в ServiceCard?

**A**:
```jsx
import ServiceCard from '@/components/ServiceCard';

const service = {
  id: 1,
  title: 'Классический массаж',
  description: 'Расслабляющий массаж',
  price: 3000,
  duration: 60,
  image: '/images/massage.jpg',  // опционально
};

export default function Services() {
  return <ServiceCard {...service} />;
}
```

---

### Q: Как добавить обработчик на кнопку "Записаться"?

**A**: ServiceCard сейчас просто отображает кнопку. Для функциональности замените на:

```jsx
// В компоненте ServiceCard
<button
  className="btn-primary w-full"
  onClick={() => router.push('/booking')}
>
  Записаться
</button>
```

Или передайте callback:

```jsx
// В странице
<ServiceCard
  {...service}
  onBooking={() => handleBooking(service.id)}
/>
```

---

### Q: Как сделать Calendar контролируемым?

**A**: Модифицируйте компонент `Calendar.jsx` для использования внешнего state:

```jsx
// В компоненте
export default function Calendar({ onDateSelect }) {
  // ... 
  const handleSelect = (day) => {
    setSelectedDate(day);
    onDateSelect?.(day);  // Вызвать callback
  };
  // ...
}

// В странице
const [selectedDate, setSelectedDate] = useState(null);

<Calendar onDateSelect={(date) => setSelectedDate(date)} />
```

---

## 📡 API

### Q: Где находятся API функции?

**A**: В файле `/src/utils/api.js`. Все функции - это mock функции, которые возвращают данные с задержкой (300-600ms).

---

### Q: Как использовать API функцию?

**A**:
```jsx
import { fetchServices } from '@/utils/api';

useEffect(() => {
  const load = async () => {
    const services = await fetchServices();
    setServices(services);
  };
  load();
}, []);
```

---

### Q: Как заменить mock API на реальный?

**A**: Отредактируйте `/src/utils/api.js`:

```javascript
// Вместо mock функции
export async function fetchServices() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(SERVICES);
    }, 500);
  });
}

// Используйте реальный fetch
export async function fetchServices() {
  const response = await fetch('/api/services');
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}
```

---

### Q: Какой формат данных возвращает API?

**A**: Смотрите документацию в `API.md`:

```javascript
// fetchServices() возвращает:
[
  {
    id: 1,
    title: 'Название',
    description: 'Описание',
    price: 3000,
    duration: 60,
    image: null,
  }
]

// createBooking() возвращает:
{
  success: true,
  booking: { id, serviceId, date, time, status },
  message: 'Успешно'
}
```

---

## 🎨 Стили и дизайн

### Q: Как изменить цветовую схему?

**A**: Отредактируйте `tailwind.config.js`:

```javascript
colors: {
  primary: '#FF0000',    // Новый цвет вместо синего
  secondary: '#ffffff',
}
```

---

### Q: Как добавить новый CSS класс?

**A**: В файле `/src/styles/globals.css`:

```css
@layer components {
  .my-custom-btn {
    @apply px-4 py-2 bg-primary text-white rounded-lg font-bold;
  }
}
```

Используйте:
```jsx
<button className="my-custom-btn">Нажми меня</button>
```

---

### Q: Где использовать inline стили?

**A**: **Избегайте inline стилей!** Всегда используйте TailwindCSS классы:

```jsx
// ❌ Плохо
<div style={{ color: 'blue', padding: '16px' }}>Text</div>

// ✅ Хорошо
<div className="text-primary p-4">Text</div>
```

---

### Q: Как сделать компонент адаптивным?

**A**: Используйте Tailwind responsive prefixes:

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 колонка на мобиле, 2 на таблете, 3 на десктопе */}
</div>

<h1 className="text-2xl md:text-3xl lg:text-4xl">
  {/* Разные размеры для разных экранов */}
</h1>
```

---

## 🚀 Развертывание

### Q: Где лучше развернуть проект?

**A**: Рекомендуемые платформы:
1. **Vercel** (идеально для Next.js) - РЕКОМЕНДУЕТСЯ
2. **Netlify** (просто и бесплатно)
3. **DigitalOcean** (дешево и мощно)
4. **AWS/Google Cloud** (масштабируемо)

Смотрите `DEPLOYMENT.md` для подробных инструкций.

---

### Q: Как развернуть на Vercel?

**A**:
```bash
# 1. Установить Vercel CLI
npm install -g vercel

# 2. Авторизоваться
vercel login

# 3. Развернуть
vercel
```

Или подключите GitHub репозиторий в панели Vercel для автоматического деплоя.

---

### Q: Где хранить environment переменные?

**A**: 
- **Локально**: В файле `.env.local` (не коммитить!)
- **На сервере/Vercel**: В панели управления (Settings → Environment Variables)

Начните с `.env.example`:
```bash
cp .env.example .env.local
# Отредактировать с вашими значениями
```

---

## 🆘 Проблемы и решения

### Q: "Module not found" ошибка

**A**: 
```bash
# 1. Проверить путь импорта (используйте @ alias)
import Header from '@/components/Header';  // ✅

# 2. Переустановить зависимости
rm -rf node_modules
npm install

# 3. Перезагрузить Dev сервер
Ctrl+C  # Остановить
npm run dev  # Запустить заново
```

---

### Q: "Cannot find module 'next/router'"

**A**:
```bash
# Обновить Next.js
npm update next

# Очистить .next папку
rm -rf .next

# Перезагрузить сервер
npm run dev
```

---

### Q: Build failed с ошибкой CSS

**A**:
```bash
# 1. Проверить tailwind.config.js
# Убедиться что content правильно указан

# 2. Проверить globals.css
# @tailwind directive должны быть в начале

# 3. Переустановить TailwindCSS
npm install -D tailwindcss postcss autoprefixer

# 4. Пересобрать
npm run build
```

---

### Q: Страница не обновляется при изменении кода

**A**:
```bash
# 1. Проверить терминал - может быть ошибка компиляции
# 2. Перезагрузить браузер (F5 или Ctrl+Shift+R)
# 3. Остановить сервер и запустить заново:
Ctrl+C
npm run dev
# 4. Очистить .next:
rm -rf .next && npm run dev
```

---

### Q: Performance медленный

**A**:
```bash
# 1. Анализировать bundle
ANALYZE=true npm run build

# 2. Используйте dynamic imports для больших компонентов
import dynamic from 'next/dynamic';
const BookingForm = dynamic(() => import('@/components/BookingForm'));

# 3. Оптимизировать изображения
use Next.js Image component

# 4. Включить caching
```

---

### Q: Как обновить проект до новой версии Next.js?

**A**:
```bash
# Обновить Next.js
npm update next

# Проверить несовместимость
npm audit

# Пересобрать
npm run build

# Если ошибки - смотреть CHANGELOG
```

---

## 📞 Дополнительная помощь

### Документация
- [README.md](./README.md) - Основная информация
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Быстрый старт
- [API.md](./API.md) - Документация API
- [COMPONENTS.md](./COMPONENTS.md) - Компоненты
- [STYLES.md](./STYLES.md) - Стили
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Развертывание
- [EXAMPLES.md](./EXAMPLES.md) - Примеры кода

### Ссылки
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [JavaScript.info](https://javascript.info)

### Сообщество
- [Next.js Discussions](https://github.com/vercel/next.js/discussions)
- [React Discord](https://discord.gg/react)
- [Tailwind CSS Discord](https://discord.gg/7NF8agS)

---

**Не нашли ответ?** Создайте issue на GitHub или напишите в поддержку! 💬
