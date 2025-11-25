# Документация компонентов

## Header.jsx

Навигационный компонент с логотипом, меню и селектором языка.

### Props
Нет обязательных props.

### Используемые компоненты
- `Link` из next/link

### Функциональность
- Липкий header (sticky top)
- Навигация по страницам
- Выбор языка (РУ/EN/DE)
- Кнопка входа
- Адаптивное меню

### Пример использования
```jsx
import Header from '@/components/Header';

export default function Page() {
  return (
    <>
      <Header />
      <main>Содержимое страницы</main>
    </>
  );
}
```

---

## Footer.jsx

Подвал сайта с информацией о компании, ссылками и контактами.

### Props
Нет обязательных props.

### Функциональность
- Информация о компании
- Секции со ссылками (услуги, компания, контакты)
- Адаптивная сетка
- Footer навигация

### Пример использования
```jsx
import Footer from '@/components/Footer';

export default function Page() {
  return (
    <>
      <main>Содержимое страницы</main>
      <Footer />
    </>
  );
}
```

---

## ServiceCard.jsx

Карточка отображающая информацию об услуге.

### Props
```jsx
{
  id: number,           // ID услуги
  title: string,        // Название услуги
  description: string,  // Описание услуги
  price: number,        // Цена в рублях
  duration: number,     // Длительность в минутах
  image: string,        // URL изображения (опционально)
}
```

### Функциональность
- Отображение изображения или эмодзи placeholder
- Название и описание
- Информация о цене и длительности
- Кнопка "Записаться"
- Hover эффекты (масштабирование, тень)

### Пример использования
```jsx
import ServiceCard from '@/components/ServiceCard';

const service = {
  id: 1,
  title: 'Классический массаж',
  description: 'Расслабляющий полнотелесный массаж',
  price: 3000,
  duration: 60,
};

export default function Services() {
  return <ServiceCard {...service} />;
}
```

---


> Примечание: Компоненты `Calendar` и `BookingForm` удалены из шаблона — проект переходит на модель приёма заявок через Supabase/внешний backend. Для разработки сохранён mock API в `utils/api.js`, который может быть использован как руководство при интеграции.

---

## UserCard.jsx

Компонент профиля пользователя.

### Props
```jsx
{
  user: {
    name: string,          // ФИО
    email: string,         // Email
    phone: string,         // Телефон
    avatar: string,        // Эмодзи или изображение
    memberSince: string,   // Дата присоединения
    bookingCount: number,  // Количество записей
    totalSpent: string,    // Сумма потраченная
  },
  isLoading: boolean,       // Статус загрузки
}
```

### Функциональность
- Отображение информации пользователя
- Аватар
- Контактная информация
- Статистика (количество записей, сумма)
- Кнопки действий
- Skeleton loading при загрузке

### Пример использования
```jsx
import UserCard from '@/components/UserCard';

const user = {
  name: 'Иван Петров',
  email: 'ivan@example.com',
  phone: '+7 (999) 123-45-67',
  avatar: '👤',
  memberSince: '2025-01-15',
  bookingCount: 5,
  totalSpent: '15000 ₽',
};

export default function Dashboard() {
  return <UserCard user={user} />;
}
```

---

## Глобальные CSS классы

### .btn-primary
Основная кнопка (синяя).
```css
.btn-primary {
  @apply px-6 py-3 bg-primary text-white rounded-lg font-semibold 
         transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer;
}
```

### .btn-secondary
Вторичная кнопка (белая с синей рамкой).
```css
.btn-secondary {
  @apply px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold 
         transition-all duration-200 hover:bg-primary hover:text-white cursor-pointer;
}
```

### .card
Карточка с тенью и padding.
```css
.card {
  @apply bg-white rounded-lg shadow-md p-6 
         transition-all duration-300 hover:shadow-xl;
}
```

### .container-custom
Контейнер с max-width и padding.
```css
.container-custom {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}
```

### .section-title
Заголовок секции.
```css
.section-title {
  @apply text-3xl sm:text-4xl font-bold text-primary mb-8;
}
```

---

## Расширение компонентов

### Добавление нового компонента

1. Создайте новый файл в `/src/components/`
2. Экспортируйте компонент по умолчанию
3. Используйте TailwindCSS классы для стилизации
4. Добавьте пропсы для гибкости

Пример:
```jsx
// src/components/MyComponent.jsx
export default function MyComponent({ title, children }) {
  return (
    <div className="card">
      <h2 className="text-xl font-bold text-primary mb-4">{title}</h2>
      {children}
    </div>
  );
}
```

### Использование компонента
```jsx
import MyComponent from '@/components/MyComponent';

export default function Page() {
  return (
    <MyComponent title="My Title">
      <p>Content goes here</p>
    </MyComponent>
  );
}
```

---

## Советы по использованию

1. **Всегда используйте TailwindCSS классы** вместо inline стилей
2. **Передавайте данные через props** для переиспользуемости
3. **Используйте глобальные классы** из globals.css
4. **Добавляйте hover эффекты** для лучшего UX
5. **Делайте компоненты адаптивными** (md:, lg: префиксы)
