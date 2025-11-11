# TailwindCSS Стили и тема

Полная документация системы стилизации проекта Froyle MVP.

## 📋 Содержание

1. [Конфигурация](#конфигурация)
2. [Цветовая схема](#цветовая-схема)
3. [Типография](#типография)
4. [Компоненты](#компоненты)
5. [Адаптивность](#адаптивность)
6. [Утилиты](#утилиты)

---

## Конфигурация

### tailwind.config.js

```javascript
module.exports = {
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
        secondary: '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### postcss.config.js

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### globals.css

Глобальные стили и компоненты TailwindCSS.

---

## 🎨 Цветовая схема

### Основные цвета

| Название | Hex | RGB | Использование |
|----------|-----|-----|---------------|
| Primary | #1E40AF | 30, 64, 175 | Кнопки, заголовки, акценты |
| Secondary | #ffffff | 255, 255, 255 | Фон, текст на темном фоне |
| Gray 50 | #f9fafb | 249, 250, 251 | Легкий фон |
| Gray 100 | #f3f4f6 | 243, 244, 246 | Фон элементов |
| Gray 300 | #d1d5db | 209, 213, 219 | Бордеры, разделители |
| Gray 600 | #4b5563 | 75, 85, 99 | Текст второго плана |
| Gray 700 | #374151 | 55, 65, 81 | Основной текст |
| Gray 900 | #111827 | 17, 24, 39 | Темный текст, footer |

### Использование цветов в Tailwind

```jsx
// Текст
<p className="text-primary">Синий текст</p>
<p className="text-gray-700">Темный текст</p>

// Фон
<div className="bg-primary">Синий фон</div>
<div className="bg-gray-50">Легкий фон</div>

// Бордеры
<div className="border border-gray-300">С бордером</div>
<div className="border-2 border-primary">Толстый синий бордер</div>
```

---

## 🔤 Типография

### Шрифт

**Основной шрифт**: Inter

Загружается из Google Fonts в `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
```

### Размеры текста

| Размер | Класс Tailwind | Использование |
|--------|----------------|---------------|
| 12px | text-xs | Маленькие метки |
| 14px | text-sm | Описания, подписи |
| 16px | text-base | Основной текст |
| 18px | text-lg | Подзаголовки |
| 20px | text-xl | Маленькие заголовки |
| 24px | text-2xl | Заголовки секций |
| 30px | text-3xl | Большие заголовки |
| 36px | text-4xl | Hero заголовки |

### Примеры использования

```jsx
// Заголовок страницы
<h1 className="text-4xl font-bold text-primary">Заголовок</h1>

// Подзаголовок секции
<h2 className="text-2xl font-semibold text-primary mb-6">Раздел</h2>

// Основной текст
<p className="text-base text-gray-700">Текст</p>

// Маленький текст
<span className="text-sm text-gray-600">Маленький текст</span>
```

### Толщина шрифта

| Толщина | Класс | Вес |
|---------|-------|-----|
| Thin | font-thin | 100 |
| Extra Light | font-extralight | 200 |
| Light | font-light | 300 |
| Normal | font-normal | 400 |
| Medium | font-medium | 500 |
| Semi Bold | font-semibold | 600 |
| Bold | font-bold | 700 |
| Extra Bold | font-extrabold | 800 |
| Black | font-black | 900 |

---

## 🎯 Компоненты

### Кнопки

#### Primary Button (.btn-primary)

```jsx
<button className="btn-primary">
  Кнопка
</button>
```

**Стили**:
- Фон: синий (#1E40AF)
- Текст: белый
- Padding: 12px 24px (py-3 px-6)
- Hover: масштабирование (scale-105) и тень (shadow-lg)

#### Secondary Button (.btn-secondary)

```jsx
<button className="btn-secondary">
  Кнопка
</button>
```

**Стили**:
- Фон: прозрачный
- Бордер: 2px синий
- Текст: синий
- Hover: фон синий, текст белый

#### Button размеры

```jsx
// Маленькая
<button className="btn-primary px-3 py-2 text-sm">Маленькая</button>

// Средняя (по умолчанию)
<button className="btn-primary">Средняя</button>

// Большая
<button className="btn-primary px-8 py-4 text-lg">Большая</button>

// Полная ширина
<button className="btn-primary w-full">Полная ширина</button>
```

### Карточки (.card)

```jsx
<div className="card">
  <h3 className="text-xl font-bold text-primary mb-2">Заголовок</h3>
  <p>Содержимое карточки</p>
</div>
```

**Стили**:
- Фон: белый
- Тень: средняя (shadow-md)
- Скругление: lg (border-radius)
- Padding: 24px (p-6)
- Hover: увеличение тени (shadow-xl)

### Контейнер (.container-custom)

```jsx
<div className="container-custom">
  Содержимое с ограничением ширины
</div>
```

**Стили**:
- Max-width: 80rem (1280px)
- Центрирование: mx-auto
- Padding: 16px (мобиль), 24px (таблет), 32px (десктоп)

### Заголовок секции (.section-title)

```jsx
<h2 className="section-title">
  Заголовок секции
</h2>
```

**Стили**:
- Размер: 30px (md+), 36px (lg+)
- Вес: bold
- Цвет: синий
- Margin-bottom: 32px

---

## 📱 Адаптивность

### Breakpoints в Tailwind

| Префикс | Размер экрана | Использование |
|---------|---------------|---------------|
| `sm:` | ≥ 640px | Больше телефонов |
| `md:` | ≥ 768px | Таблеты |
| `lg:` | ≥ 1024px | Большие таблеты/маленькие десктопы |
| `xl:` | ≥ 1280px | Десктопы |
| `2xl:` | ≥ 1536px | Большие десктопы |

### Примеры адаптивных классов

```jsx
// Текст
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Адаптивный заголовок
</h1>

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div>Колонка 1</div>
  <div>Колонка 2</div>
  <div>Колонка 3</div>
</div>

// Padding
<div className="p-4 md:p-8 lg:p-12">
  Адаптивный padding
</div>

// Display
<nav className="hidden md:flex gap-8">
  Скрыта на мобиле, видна на таблете+
</nav>
```

### Mobile-first подход

```jsx
// Обычно пишем для мобиля, потом добавляем для больших экранов
<div className="flex flex-col md:flex-row gap-4">
  {/* На мобиле: колонка, На таблете+: строка */}
</div>
```

---

## ✨ Утилиты

### Spacing (отступы)

```jsx
// Padding
<div className="p-4">p-4 (16px со всех сторон)</div>
<div className="px-6 py-3">px-6 (24px слева-справа), py-3 (12px сверху-снизу)</div>
<div className="pt-4 pb-8">pt-4 (сверху), pb-8 (снизу)</div>

// Margin
<div className="m-4">m-4 (16px со всех сторон)</div>
<div className="mx-auto">mx-auto (центрирование по горизонтали)</div>
<div className="mb-8">mb-8 (32px снизу)</div>
```

### Эффекты при наведении (Hover)

```jsx
// Масштабирование
<button className="hover:scale-105">Увеличение на 5%</button>

// Тень
<div className="shadow-md hover:shadow-lg">Увеличение тени</div>
<div className="shadow-md hover:shadow-xl">Сильная тень при наведении</div>

// Цвет
<button className="text-gray-600 hover:text-primary">Смена цвета текста</button>
<button className="bg-gray-100 hover:bg-gray-200">Смена цвета фона</button>

// Комбинация
<div className="card hover:scale-105 hover:shadow-xl transition-all">
  Карточка с множественными эффектами
</div>
```

### Переходы (Transitions)

```jsx
// Базовый переход
<button className="transition">Базовый переход</button>

// С длительностью
<button className="transition-all duration-200">200ms</button>
<button className="transition-all duration-300">300ms</button>

// Для конкретного свойства
<button className="transition-colors duration-200 hover:bg-primary">
  Плавная смена цвета
</button>

// Типичный паттерн
<button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">
  Кнопка с эффектами
</button>
```

### Тени (Shadows)

```jsx
// Небольшая тень
<div className="shadow-sm"></div>

// Средняя тень
<div className="shadow-md"></div>

// Большая тень
<div className="shadow-lg"></div>

// Очень большая
<div className="shadow-xl"></div>

// Огромная
<div className="shadow-2xl"></div>

// Без тени
<div className="shadow-none"></div>
```

### Скругление (Border Radius)

```jsx
<div className="rounded">Небольшое скругление</div>
<div className="rounded-lg">Среднее скругление</div>
<div className="rounded-xl">Большое скругление</div>
<div className="rounded-full">Идеальный круг</div>
```

### Opacity (Прозрачность)

```jsx
<div className="bg-primary bg-opacity-50">50% прозрачности</div>
<div className="opacity-75">75% видимости</div>
<div className="opacity-50">50% видимости</div>
```

### Flex и Grid

```jsx
// Flex
<div className="flex justify-between items-center gap-4">
  <div>Элемент 1</div>
  <div>Элемент 2</div>
  <div>Элемент 3</div>
</div>

// Grid с 3 колонками
<div className="grid grid-cols-3 gap-4">
  <div>1</div>
  <div>2</div>
  <div>3</div>
</div>

// Адаптивный grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div>1</div>
  <div>2</div>
  <div>3</div>
</div>
```

---

## 📝 Лучшие практики

1. **Используйте CSS классы из globals.css** вместо repeat кода
2. **Комбинируйте классы** для сложного стиля
3. **Используйте адаптивные префиксы** (md:, lg:, sm:)
4. **Добавляйте hover эффекты** для интерактивности
5. **Следуйте мобайл-фирст подходу**
6. **Используйте переменные из конфига** (colors, spacing, etc.)
7. **Избегайте inline стилей** - используйте классы
8. **Документируйте сложные комбинации** классов

---

## 🚀 Примеры компонентов

### Стильная карточка услуги

```jsx
<div className="card group">
  <div className="bg-gradient-to-br from-primary to-blue-600 rounded-lg h-48 mb-4 group-hover:scale-105 transition-transform duration-300"></div>
  <h3 className="text-xl font-bold text-primary mb-2">Название</h3>
  <p className="text-gray-600 text-sm mb-4">Описание</p>
  <button className="btn-primary w-full">Записаться</button>
</div>
```

### Заголовок с гра
диентом

```jsx
<h1 className="text-5xl font-bold">
  <span className="text-primary">Froyle</span> MVP
</h1>
```

### Кнопка с иконкой

```jsx
<button className="btn-primary flex items-center gap-2">
  <span>📚</span>
  Начать обучение
</button>
```

### Адаптивная сетка

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
  {/* Контент */}
</div>
```

---

## 🔗 Ресурсы

- [Tailwind CSS Документация](https://tailwindcss.com/docs)
- [Tailwind CSS Config](https://tailwindcss.com/docs/configuration)
- [Tailwind CSS Playground](https://play.tailwindcss.com/)
- [Inter Font](https://fonts.google.com/specimen/Inter)
