# API Mock Documentation

Полная документация всех доступных API функций для работы с платформой Froyle.

## Расположение файла
`src/utils/api.js`

---

## Услуги (Services)

### fetchServices()

Получить список всех доступных услуг.

**Параметры**: нет

**Возвращает**: `Promise<Array>`

**Тип данных**:
```javascript
[
  {
    id: number,
    title: string,
    description: string,
    price: number,
    duration: number,
    image: string | null,
  }
]
```

**Время ответа**: ~500ms (имитация сети)

**Пример использования**:
```jsx
import { fetchServices } from '@/utils/api';

// В компоненте
useEffect(() => {
  const loadServices = async () => {
    const services = await fetchServices();
    setServices(services);
  };
  loadServices();
}, []);
```

---

### fetchServiceById(id)

Получить информацию об конкретной услуге.

**Параметры**:
- `id` (number) - ID услуги

**Возвращает**: `Promise<Object | null>`

**Тип данных**:
```javascript
{
  id: number,
  title: string,
  description: string,
  price: number,
  duration: number,
  image: string | null,
}
```

**Пример использования**:
```jsx
const service = await fetchServiceById(1);
```

---

## Пользователи (Users)

### fetchUserProfile(userId)

Получить профиль пользователя.

**Параметры**:
- `userId` (number, опционально) - ID пользователя (по умолчанию: 1)

**Возвращает**: `Promise<Object>`

**Тип данных**:
```javascript
{
  id: number,
  name: string,
  email: string,
  phone: string,
  avatar: string,
  memberSince: string,     // YYYY-MM-DD
  bookingCount: number,
  totalSpent: string,
}
```

**Пример использования**:
```jsx
import { fetchUserProfile } from '@/utils/api';

const user = await fetchUserProfile(1);
```

---

## Бронирования (Bookings)

### fetchUserBookings(userId)

Получить все бронирования пользователя.

**Параметры**:
- `userId` (number, опционально) - ID пользователя (по умолчанию: 1)

**Возвращает**: `Promise<Array>`

**Тип данных**:
```javascript
[
  {
    id: number,
    serviceId: number,
    date: string,           // YYYY-MM-DD
    time: string,           // HH:mm
    status: 'confirmed' | 'pending',
  }
]
```

**Пример использования**:
```jsx
const bookings = await fetchUserBookings();
```

---

### createBooking(bookingData)

Создать новое бронирование.

**Параметры**:
- `bookingData` (Object)
  ```javascript
  {
    serviceId: number,
    date: string,          // YYYY-MM-DD
    time: string,          // HH:mm
    name: string,          // ФИО
    email: string,
    phone: string,
    notes: string,         // опционально
  }
  ```

**Возвращает**: `Promise<Object>`

**Тип данных**:
```javascript
{
  success: boolean,
  booking: {
    id: number,
    serviceId: number,
    date: string,
    time: string,
    status: 'pending',
  },
  message: string,
}
```

**Время ответа**: ~600ms

**Пример использования**:
```jsx
import { createBooking } from '@/utils/api';

const result = await createBooking({
  serviceId: 1,
  date: '2025-01-20',
  time: '10:00',
  name: 'Иван Петров',
  email: 'ivan@example.com',
  phone: '+7 (999) 123-45-67',
  notes: 'Есть аллергия на масла с эвкалиптом',
});

if (result.success) {
  console.log('Бронирование создано:', result.booking);
}
```

---

### updateBooking(bookingId, updateData)

Обновить существующее бронирование.

**Параметры**:
- `bookingId` (number) - ID бронирования
- `updateData` (Object) - Поля для обновления

**Возвращает**: `Promise<Object>`

**Тип данных**:
```javascript
{
  success: boolean,
  booking: Object,
  message: string,
}
```

**Пример использования**:
```jsx
const result = await updateBooking(1, {
  date: '2025-01-21',
  time: '14:00',
  status: 'confirmed',
});
```

---

### cancelBooking(bookingId)

Отменить бронирование.

**Параметры**:
- `bookingId` (number) - ID бронирования

**Возвращает**: `Promise<Object>`

**Тип данных**:
```javascript
{
  success: boolean,
  message: string,
}
```

**Пример использования**:
```jsx
const result = await cancelBooking(1);
if (result.success) {
  console.log('Бронирование отменено');
}
```

---

## Доступные слоты (Available Slots)

### fetchAvailableSlots(serviceId, date)

Получить доступные слоты времени для услуги на конкретную дату.

**Параметры**:
- `serviceId` (number) - ID услуги
- `date` (string) - Дата в формате YYYY-MM-DD

**Возвращает**: `Promise<Array>`

**Тип данных**:
```javascript
[
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  // ... и т.д.
]
```

**Примечание**: Времена возвращаются в формате HH:mm (24-часовой формат)

**Пример использования**:
```jsx
const slots = await fetchAvailableSlots(1, '2025-01-20');
// ["09:00", "09:30", "10:00", "10:30", "11:00", ...]
```

---

## Администрирование (Admin)

### fetchAdminStats()

Получить статистику платформы для администратора.

**Параметры**: нет

**Возвращает**: `Promise<Object>`

**Тип данных**:
```javascript
{
  totalBookings: number,
  totalUsers: number,
  totalRevenue: string,
  pendingBookings: number,
  completedBookings: number,
}
```

**Пример использования**:
```jsx
import { fetchAdminStats } from '@/utils/api';

const stats = await fetchAdminStats();
console.log(`Всего бронирований: ${stats.totalBookings}`);
console.log(`Пользователей: ${stats.totalUsers}`);
```

---

## Mock данные

### Услуги (SERVICES)
6 предустановленных услуг:
1. Классический массаж - 3000₽, 60 мин
2. Йога для начинающих - 1500₽, 90 мин
3. Фитнес-тренировка - 2000₽, 45 мин
4. Релаксирующая йога - 1500₽, 60 мин
5. Консультация диетолога - 2500₽, 45 мин
6. Спортивный массаж - 4000₽, 60 мин

### Пользователь (MOCK_USER)
```javascript
{
  id: 1,
  name: 'Иван Петров',
  email: 'ivan@example.com',
  phone: '+7 (999) 123-45-67',
  avatar: '👤',
  memberSince: '2025-01-15',
  bookingCount: 5,
  totalSpent: '15000 ₽',
}
```

### Бронирования (MOCK_BOOKINGS)
3 предустановленных бронирования

---

## Интеграция с реальным API

Для замены mock API на реальный, просто замените функции на вызовы fetch или axios:

**Пример с fetch**:
```javascript
export async function fetchServices() {
  const response = await fetch('/api/services');
  if (!response.ok) throw new Error('Failed to fetch services');
  return response.json();
}
```

**Пример с axios**:
```javascript
import axios from 'axios';

export async function fetchServices() {
  const { data } = await axios.get('/api/services');
  return data;
}
```

---

## Обработка ошибок

При использовании в компонентах добавляйте обработку ошибок:

```jsx
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await fetchServices();
      setServices(data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setError('Не удалось загрузить услуги');
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, []);
```

---

## Тестирование

Для тестирования API функций в консоли браузера:

```javascript
// Импортируйте функцию (если используется в модуле)
import * as api from '@/utils/api';

// Вызовите функцию
api.fetchServices().then(data => console.log(data));
```

---

## Типы ошибок

- **Время ответа**: Все функции имеют имитацию задержки (300-600ms)
- **Валидация**: Базовая валидация данных
- **Статус**: Поля `success` и `message` для отслеживания результата

---

## Будущие улучшения

- [ ] Добавить обработку ошибок с код
- [ ] Добавить retry логику
- [ ] Добавить кэширование
- [ ] Добавить pagination
- [ ] Добавить фильтрацию
- [ ] Добавить сортировку
