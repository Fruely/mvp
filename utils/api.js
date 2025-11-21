/**
 * API Mock Functions
 * Placeholder для реальных API вызовов
 */

// Mock данные услуг
const SERVICES = [
  {
    id: 1,
    title: 'Классический массаж',
    description: 'Расслабляющий полнотелесный массаж для снятия стресса и напряжения мышц.',
    price: 3000,
    duration: 60,
    image: null,
  },
  {
    id: 2,
    title: 'Йога для начинающих',
    description: 'Основные асаны и дыхательные упражнения для всех уровней подготовки.',
    price: 1500,
    duration: 90,
    image: null,
  },
  {
    id: 3,
    title: 'Фитнес-тренировка',
    description: 'Интенсивная тренировка для укрепления мышц и улучшения кардиовыносливости.',
    price: 2000,
    duration: 45,
    image: null,
  },
  {
    id: 4,
    title: 'Релаксирующая йога',
    description: 'Мягкие упражнения для релаксации и улучшения гибкости перед сном.',
    price: 1500,
    duration: 60,
    image: null,
  },
  {
    id: 5,
    title: 'Консультация диетолога',
    description: 'Персональная консультация по питанию и составлению меню здорового образа жизни.',
    price: 2500,
    duration: 45,
    image: null,
  },
  {
    id: 6,
    title: 'Спортивный массаж',
    description: 'Специализированный массаж для спортсменов и активных людей.',
    price: 4000,
    duration: 60,
    image: null,
  },
];

// Mock данные пользователя
const MOCK_USER = {
  id: 1,
  name: 'Иван Петров',
  email: 'ivan@example.com',
  phone: '+7 (999) 123-45-67',
  avatar: '👤',
  memberSince: '2025-01-15',
  bookingCount: 5,
  totalSpent: '15000 ₽',
};

// Mock данные бронирований
const MOCK_BOOKINGS = [
  {
    id: 1,
    serviceId: 1,
    date: '2025-01-20',
    time: '10:00',
    status: 'confirmed',
  },
  {
    id: 2,
    serviceId: 2,
    date: '2025-01-22',
    time: '18:00',
    status: 'confirmed',
  },
  {
    id: 3,
    serviceId: 3,
    date: '2025-01-25',
    time: '15:30',
    status: 'pending',
  },
];

/**
 * GET - Получить все услуги
 */
export async function fetchServices() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(SERVICES);
    }, 500); // Имитация задержки сети
  });
}

/**
 * GET - Получить услугу по ID
 */
export async function fetchServiceById(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const service = SERVICES.find(s => s.id === id);
      resolve(service || null);
    }, 300);
  });
}

/**
 * GET - Получить профиль пользователя
 */
export async function fetchUserProfile(userId = 1) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_USER);
    }, 400);
  });
}

/**
 * GET - Получить все бронирования пользователя
 */
export async function fetchUserBookings(userId = 1) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_BOOKINGS);
    }, 500);
  });
}

/**
 * POST - Создать бронирование
 */
export async function createBooking(bookingData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newBooking = {
        id: MOCK_BOOKINGS.length + 1,
        ...bookingData,
        status: 'pending',
      };
      MOCK_BOOKINGS.push(newBooking);
      resolve({
        success: true,
        booking: newBooking,
        message: 'Бронирование успешно создано',
      });
    }, 600);
  });
}

/**
 * PUT - Обновить бронирование
 */
export async function updateBooking(bookingId, updateData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const booking = MOCK_BOOKINGS.find(b => b.id === bookingId);
      if (booking) {
        Object.assign(booking, updateData);
        resolve({
          success: true,
          booking,
          message: 'Бронирование обновлено',
        });
      } else {
        resolve({
          success: false,
          message: 'Бронирование не найдено',
        });
      }
    }, 400);
  });
}

/**
 * DELETE - Отменить бронирование
 */
export async function cancelBooking(bookingId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = MOCK_BOOKINGS.findIndex(b => b.id === bookingId);
      if (index > -1) {
        const booking = MOCK_BOOKINGS[index];
        MOCK_BOOKINGS.splice(index, 1);
        resolve({
          success: true,
          message: 'Бронирование отменено',
        });
      } else {
        resolve({
          success: false,
          message: 'Бронирование не найдено',
        });
      }
    }, 300);
  });
}

/**
 * GET - Получить доступные слоты времени для услуги
 */
export async function fetchAvailableSlots(serviceId, date) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Генерируем случайные доступные слоты
      const slots = [];
      const startHour = 9;
      const endHour = 18;

      for (let i = startHour; i < endHour; i++) {
        if (Math.random() > 0.3) { // 70% вероятность что слот доступен
          slots.push(`${String(i).padStart(2, '0')}:00`);
          if (Math.random() > 0.6) {
            slots.push(`${String(i).padStart(2, '0')}:30`);
          }
        }
      }

      resolve(slots);
    }, 400);
  });
}

/**
 * GET - Получить admin статистику
 */
export async function fetchAdminStats() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalBookings: 156,
        totalUsers: 89,
        totalRevenue: '450000 ₽',
        pendingBookings: 12,
        completedBookings: 144,
      });
    }, 500);
  });
}

export default {
  fetchServices,
  fetchServiceById,
  fetchUserProfile,
  fetchUserBookings,
  createBooking,
  updateBooking,
  cancelBooking,
  fetchAvailableSlots,
  fetchAdminStats,
};
