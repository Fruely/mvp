import { useState, useEffect } from 'react';
import Header from '../components/Header';
import UserCard from '../components/UserCard';
import { fetchUserProfile, fetchUserBookings } from '../utils/api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, bookingsData] = await Promise.all([
          fetchUserProfile(),
          fetchUserBookings(),
        ]);
        setUser(userData);
        setBookings(bookingsData);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow container-custom py-12">
        <h1 className="section-title mb-12">Личный кабинет</h1>

        {loading ? (
          <div className="animate-pulse">
            <div className="h-64 bg-gray-300 rounded-lg mb-8"></div>
            <div className="h-96 bg-gray-300 rounded-lg"></div>
          </div>
        ) : (
          <>
            {/* User Profile Card */}
            <div className="mb-12">
              <UserCard user={user} />
            </div>

            {/* Bookings Section */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">Мои записи</h2>

              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg mb-4">У вас нет активных записей</p>
                  <button className="btn-primary">
                    Записаться на услугу
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-4 px-4 font-semibold text-primary">ID</th>
                        <th className="text-left py-4 px-4 font-semibold text-primary">Услуга</th>
                        <th className="text-left py-4 px-4 font-semibold text-primary">Дата</th>
                        <th className="text-left py-4 px-4 font-semibold text-primary">Время</th>
                        <th className="text-left py-4 px-4 font-semibold text-primary">Статус</th>
                        <th className="text-left py-4 px-4 font-semibold text-primary">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(booking => (
                        <tr key={booking.id} className="border-b border-gray-200 hover:bg-blue-50">
                          <td className="py-4 px-4">#{booking.id}</td>
                          <td className="py-4 px-4">Услуга #{booking.serviceId}</td>
                          <td className="py-4 px-4">{booking.date}</td>
                          <td className="py-4 px-4">{booking.time}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              booking.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {booking.status === 'confirmed' ? 'Подтверждена' : 'На рассмотрении'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button className="text-primary hover:underline text-sm font-semibold">
                              Отменить
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Settings Section */}
            <div className="mt-12 bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">Настройки профиля</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Уведомления по Email
                  </label>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="ml-2 text-gray-600">Получать уведомления об записях</span>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SMS Уведомления
                  </label>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="ml-2 text-gray-600">Получать SMS напоминания</span>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button className="btn-primary">
                  Сохранить изменения
                </button>
                <button className="btn-secondary">
                  Выход
                </button>
              </div>
            </div>
          </>
        )}
      </main>

    </div>
  );
}
