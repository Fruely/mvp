# Быстрый старт 🚀

Руководство по быстрому развертыванию и запуску проекта Froyle MVP.

## 📋 Системные требования

- **Node.js**: версия 16 или выше
- **npm**: версия 8 или выше (или yarn/pnpm)
- **ОС**: Windows, macOS, Linux

## 🔧 Установка

### Шаг 1: Клонирование репозитория

```bash
git clone <your-repo-url> froyle-mvp
cd froyle-mvp
```

### Шаг 2: Установка зависимостей

```bash
npm install
```

Или если используете yarn:
```bash
yarn install
```

### Шаг 3: Запуск проекта в режиме разработки

```bash
npm run dev
```

Проект откроется на `http://localhost:3000`

---

## 🌐 Доступные страницы

После запуска вы сможете открыть следующие страницы:

| Страница | URL | Описание |
|----------|-----|---------|
| 🏠 Главная | http://localhost:3000 | Список услуг |
| 📅 Запись | http://localhost:3000/booking | Бронирование услуги |
| 👤 Кабинет | http://localhost:3000/dashboard | Личный кабинет |
| ⚙️ Админ | http://localhost:3000/admin | Админ-панель |

---

## 📁 Структура проекта

```
froyle-mvp/
├── src/
│   ├── components/          # React компоненты
│   │   ├── Header.jsx       # Навигация
│   │   ├── Footer.jsx       # Подвал
│   │   ├── ServiceCard.jsx  # Карточка услуги
│   │   ├── Calendar.jsx     # Календарь
│   │   ├── BookingForm.jsx  # Форма записи
│   │   └── UserCard.jsx     # Профиль
│   ├── pages/               # Next.js страницы
│   │   ├── index.jsx        # Главная (/)
│   │   ├── booking.jsx      # Запись (/booking)
│   │   ├── dashboard.jsx    # Кабинет (/dashboard)
│   │   ├── admin.jsx        # Админ (/admin)
│   │   ├── _app.jsx         # App wrapper
│   │   └── _document.jsx    # HTML документ
│   ├── styles/              # CSS файлы
│   │   └── globals.css      # Глобальные стили
│   ├── utils/               # Утилиты
│   │   └── api.js           # Mock API функции
│   └── assets/              # Изображения и файлы
├── public/                  # Статические файлы
├── package.json             # Зависимости проекта
├── tailwind.config.js       # TailwindCSS конфиг
├── next.config.js           # Next.js конфиг
├── postcss.config.js        # PostCSS конфиг
├── .eslintrc.json          # ESLint конфиг
├── README.md               # Основная документация
├── API.md                  # Документация API
├── COMPONENTS.md           # Документация компонентов
├── STYLES.md              # Документация стилей
└── GETTING_STARTED.md     # Этот файл
```

---

## 🎨 Кастомизация

### Изменение цветовой схемы

Отредактируйте `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#1E40AF',      // Измените на нужный цвет
      secondary: '#ffffff',
    },
  },
},
```

### Добавление нового компонента

1. Создайте файл в `src/components/`:

```jsx
// src/components/MyComponent.jsx
export default function MyComponent({ title }) {
  return (
    <div className="card">
      <h2 className="text-xl font-bold text-primary">{title}</h2>
    </div>
  );
}
```

2. Используйте в странице:

```jsx
import MyComponent from '@/components/MyComponent';

export default function Page() {
  return <MyComponent title="My Title" />;
}
```

### Добавление новой страницы

1. Создайте файл в `src/pages/`:

```jsx
// src/pages/my-page.jsx
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

2. Страница будет доступна по URL: `/my-page`

---

## 🛠️ Доступные команды

```bash
# Запуск в режиме разработки
npm run dev

# Сборка для production
npm run build

# Запуск production версии
npm start

# Проверка кода линтером
npm run lint

# Исправление линтер ошибок
npm run lint -- --fix
```

---

## 📚 Документация

### Компоненты
Полная документация всех компонентов в `COMPONENTS.md`:
- Header
- Footer  
- ServiceCard
- Calendar
- BookingForm
- UserCard

### API Functions
Документация всех API функций в `API.md`:
- fetchServices()
- createBooking()
- fetchUserProfile()
- И многое другое...

### Стили
Полное руководство по TailwindCSS в `STYLES.md`:
- Цветовая схема
- Типография
- Компоненты CSS
- Адаптивность
- Утилиты

---

## 🚀 Развертывание

### Развертывание на Vercel (рекомендуется)

```bash
# 1. Установите Vercel CLI
npm install -g vercel

# 2. Разверните проект
vercel
```

### Развертывание на другой хостинг

```bash
# 1. Соберите проект
npm run build

# 2. Запустите production версию
npm start
```

---

## 🐛 Решение проблем

### Порт 3000 уже занят

```bash
# Запустите на другом порту
npm run dev -- -p 3001
```

### Ошибка при установке зависимостей

```bash
# Очистите кэш npm
npm cache clean --force

# Удалите node_modules и package-lock.json
rm -rf node_modules package-lock.json

# Переустановите зависимости
npm install
```

### Проблемы с TailwindCSS

```bash
# Пересоберите Tailwind
npm run build

# Проверьте конфиг tailwind.config.js
```

---

## 💡 Советы

1. **Используйте VS Code расширения**:
   - Tailwind CSS IntelliSense
   - ES7+ React/Redux/React-Native snippets
   - Prettier - Code formatter

2. **Горячая перезагрузка**: Next.js автоматически перезагружает страницу при изменении кода

3. **Консоль браузера**: Проверяйте консоль для ошибок и логов

4. **Mock данные**: Все API функции возвращают mock данные - замените на реальный API позже

5. **Placeholder изображения**: Используются эмодзи - замените на реальные изображения

---

## 🤝 Внесение изменений

### Добавление функции

1. Создайте новый файл или отредактируйте существующий
2. Используйте компоненты из `src/components/`
3. Используйте функции из `src/utils/api.js`
4. Запустите `npm run lint` для проверки кода

### Обновление стилей

1. Отредактируйте `src/styles/globals.css`
2. Или добавьте inline классы TailwindCSS
3. Проверьте результат на разных экранах

### Интеграция реального API

1. Откройте `src/utils/api.js`
2. Замените функции на реальные fetch/axios вызовы
3. Добавьте обработку ошибок
4. Протестируйте функциональность

---

## 📞 Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте документацию (README.md, API.md, COMPONENTS.md, STYLES.md)
2. Посмотрите примеры в существующих компонентах
3. Проверьте консоль браузера для ошибок
4. Прочитайте [Next.js документацию](https://nextjs.org/docs)
5. Прочитайте [TailwindCSS документацию](https://tailwindcss.com/docs)

---

## 🎓 Дальнейшее обучение

### Углубленное изучение

1. **Next.js**: API Routes, SSR, ISR
2. **React**: Hooks, Context, Performance
3. **TailwindCSS**: Custom components, Plugins
4. **Database**: PostgreSQL, MongoDB
5. **Authentication**: NextAuth, Auth0
6. **Payments**: Stripe, PayPal

### Рекомендуемые ресурсы

- [Next.js Learn](https://nextjs.org/learn)
- [React Docs](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [JavaScript.info](https://javascript.info)

---

## ✅ Чек-лист для продвижения в production

- [ ] Заменены placeholder изображения
- [ ] Заменены mock API на реальные вызовы
- [ ] Добавлена аутентификация
- [ ] Добавлена обработка ошибок
- [ ] Протестирована функциональность на разных браузерах
- [ ] Оптимизирована производительность
- [ ] Добавлены сертификаты SSL
- [ ] Настроена аналитика
- [ ] Протестирована безопасность
- [ ] Развернуто на production хосте

---

**Готовы начать?** Запустите `npm run dev` и откройте http://localhost:3000! 🎉
