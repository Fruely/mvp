# Примеры использования

Практические примеры использования компонентов и функций проекта.

## 📖 Содержание

1. [Примеры компонентов](#примеры-компонентов)
2. [Примеры API](#примеры-api)
3. [Примеры страниц](#примеры-страниц)
4. [Паттерны](#паттерны)

---

## 🎨 Примеры компонентов

### ServiceCard с разными данными

```jsx
import ServiceCard from '@/components/ServiceCard';

export default function ServicesShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Без изображения */}
      <ServiceCard
        id={1}
        title="Классический массаж"
        description="Расслабляющий массаж для снятия стресса"
        price={3000}
        duration={60}
      />

      {/* С изображением */}
      <ServiceCard
        id={2}
        title="Йога"
        description="Занятие йогой для начинающих"
        price={1500}
        duration={90}
        image="/images/yoga.jpg"
      />

      {/* Разные эмодзи */}
      <ServiceCard
        id={3}
        title="Фитнес"
        description="Интенсивная тренировка"
        price={2000}
        duration={45}
      />
    </div>
  );
}
```

### Header с разными состояниями

```jsx
import Header from '@/components/Header';

// Обычное использование
export default function Page() {
  return (
    <>
      <Header />
      <main>Содержимое</main>
    </>
  );
}

// Header всегда видна на странице
// Автоматически переходит между страницами
```

### Работа с заявками (backend)

В этом шаблоне UI-виджеты для бронирования (календарь и форма) удалены в пользу использования внешней системы заявок (например, Supabase). Для интеграции используйте backend (Supabase) и вызовы API — в проекте оставлен `utils/api.js` с mock-функциями, которые помогут при миграции:

```js
import { createBooking } from '@/utils/api';

async function handleBooking() {
  const result = await createBooking({
    serviceId: 1,
    date: '2025-01-20',
    time: '10:00',
    name: 'Иван Петров',
    email: 'ivan@example.com',
    phone: '+7 (999) 123-45-67',
    notes: 'Переходим на Supabase',
  });

  if (result.success) {
    console.log('Бронирование создано (mock):', result.booking);
  }
}
```

### UserCard с загрузкой

```jsx
import { useState, useEffect } from 'react';
import UserCard from '@/components/UserCard';
import { fetchUserProfile } from '@/utils/api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserProfile(1);
        setUser(userData);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return <UserCard user={user} isLoading={loading} />;
}
```

---

## 📡 Примеры API

### Загрузка списка услуг

```jsx
import { useState, useEffect } from 'react';
import { fetchServices } from '@/utils/api';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await fetchServices();
        setServices(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div>
      {services.map(service => (
        <div key={service.id}>
          <h3>{service.title}</h3>
          <p>{service.description}</p>
          <p>{service.price}₽ - {service.duration} мин</p>
        </div>
      ))}
    </div>
  );
}
```

### Создание бронирования

```jsx
import { createBooking } from '@/utils/api';

async function handleBooking() {
  try {
    const result = await createBooking({
      serviceId: 1,
      date: '2025-01-20',
      time: '10:00',
      name: 'Иван Петров',
      email: 'ivan@example.com',
      phone: '+7 (999) 123-45-67',
      notes: 'Есть аллергия на масла',
    });

    if (result.success) {
      console.log('Бронирование создано:', result.booking);
      // Показать успешное сообщение
    } else {
      console.error('Ошибка:', result.message);
      // Показать ошибку
    }
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}
```

### Получение бронирований пользователя

```jsx
import { fetchUserBookings } from '@/utils/api';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const data = await fetchUserBookings(1); // userId = 1
        setBookings(data);
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      }
    };

    loadBookings();
  }, []);

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Услуга</th>
          <th>Дата</th>
          <th>Время</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>
        {bookings.map(booking => (
          <tr key={booking.id}>
            <td>{booking.id}</td>
            <td>Услуга #{booking.serviceId}</td>
            <td>{booking.date}</td>
            <td>{booking.time}</td>
            <td>{booking.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Отмена бронирования

```jsx
import { cancelBooking } from '@/utils/api';

async function handleCancel(bookingId) {
  const confirmed = window.confirm('Вы уверены?');
  if (!confirmed) return;

  try {
    const result = await cancelBooking(bookingId);
    if (result.success) {
      console.log('Бронирование отменено');
      // Обновить список
    }
  } catch (error) {
    console.error('Ошибка при отмене:', error);
  }
}
```

### Получение статистики для админа

```jsx
import { fetchAdminStats } from '@/utils/api';

export default function AdminStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      const data = await fetchAdminStats();
      setStats(data);
    };

    loadStats();
  }, []);

  if (!stats) return <div>Загрузка...</div>;

  return (
    <div>
      <p>Всего бронирований: {stats.totalBookings}</p>
      <p>Пользователей: {stats.totalUsers}</p>
      <p>Выручка: {stats.totalRevenue}</p>
      <p>На рассмотрении: {stats.pendingBookings}</p>
      <p>Завершено: {stats.completedBookings}</p>
    </div>
  );
}
```

---

## 📄 Примеры страниц

### Главная страница с услугами

```jsx
// pages/index.jsx
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ServiceCard from '@/components/ServiceCard';
import { fetchServices } from '@/utils/api';

export default function Home() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchServices();
      setServices(data);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container-custom py-12">
        <h1 className="section-title">Наши услуги</h1>
        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <ServiceCard key={service.id} {...service} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
```

### Страница бронирования (удалена)

В этом шаблоне страница `/booking` и встроенные UI-компоненты для бронирования (календарь/форма) удалены. Рекомендуется реализовать приём заявок через Supabase или ваш backend и вызывать API из фронтенда. См. разделы `EXAMPLES.md` и `utils/api.js` для примера mock-вызовов.

### Личный кабинет

```jsx
// pages/dashboard.jsx
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UserCard from '@/components/UserCard';
import { fetchUserProfile, fetchUserBookings } from '@/utils/api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [userData, bookingsData] = await Promise.all([
        fetchUserProfile(),
        fetchUserBookings(),
      ]);
      setUser(userData);
      setBookings(bookingsData);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container-custom py-12">
        <h1 className="section-title">Личный кабинет</h1>
        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <>
            <UserCard user={user} />
            <h2 className="text-2xl font-bold text-primary mt-12 mb-6">
              Мои записи
            </h2>
            <div className="card">
              {bookings.map(b => (
                <div key={b.id} className="p-4 border-b">
                  <p>Дата: {b.date} Время: {b.time}</p>
                  <p>Статус: {b.status}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
```

---

## 🎯 Паттерны

### Паттерн: Загрузка с состояниями

```jsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const load = async () => {
    try {
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  load();
}, []);

// Использование
if (loading) return <div>Загрузка...</div>;
if (error) return <div>Ошибка: {error.message}</div>;
return <div>{/* Отобразить данные */}</div>;
```

### Паттерн: Форма с валидацией

```jsx
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
});

const [errors, setErrors] = useState({});

const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};

const validate = () => {
  const newErrors = {};
  if (!formData.name) newErrors.name = 'ФИО обязательно';
  if (!formData.email.includes('@')) newErrors.email = 'Неверный email';
  return newErrors;
};

const handleSubmit = (e) => {
  e.preventDefault();
  const validationErrors = validate();
  if (Object.keys(validationErrors).length === 0) {
    // Отправить форму
    submitForm(formData);
  } else {
    setErrors(validationErrors);
  }
};
```

### Паттерн: Фильтрация и поиск

```jsx
const [services, setServices] = useState([]);
const [search, setSearch] = useState('');
const [filter, setFilter] = useState('all');

const filteredServices = services
  .filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
  .filter(s => filter === 'all' || s.category === filter);

return (
  <>
    <input
      type="text"
      placeholder="Поиск..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
      <option value="all">Все</option>
      <option value="massage">Массаж</option>
      <option value="yoga">Йога</option>
    </select>
    {filteredServices.map(s => (
      <div key={s.id}>{s.title}</div>
    ))}
  </>
);
```

### Паттерн: Синхронизация с URL

```jsx
import { useRouter } from 'next/router';

export default function Services() {
  const router = useRouter();
  const { category } = router.query;

  const handleFilter = (cat) => {
    router.push(`/services?category=${cat}`);
  };

  return (
    <div>
      <button onClick={() => handleFilter('massage')}>Массаж</button>
      {/* Контент фильтруется по category */}
    </div>
  );
}
```

---

## 🔗 Связанные документы

- [README.md](./README.md) - Основная информация
- [COMPONENTS.md](./COMPONENTS.md) - Документация компонентов
- [API.md](./API.md) - Документация API
- [STYLES.md](./STYLES.md) - Документация стилей
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Быстрый старт
