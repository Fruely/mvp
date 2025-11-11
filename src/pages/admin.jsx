import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchAdminStats, fetchUserBookings } from '@/utils/api';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, bookingsData] = await Promise.all([
          fetchAdminStats(),
          fetchUserBookings(),
        ]);
        setStats(statsData);
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
        <h1 className="section-title mb-12">Админ-панель</h1>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
              <div className="card">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Всего бронирований</h3>
                <p className="text-3xl font-bold text-primary">{stats?.totalBookings}</p>
              </div>

              <div className="card">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Активные пользователи</h3>
                <p className="text-3xl font-bold text-primary">{stats?.totalUsers}</p>
              </div>

              <div className="card">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Общая выручка</h3>
                <p className="text-3xl font-bold text-primary">{stats?.totalRevenue}</p>
              </div>

              <div className="card">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">На рассмотрении</h3>
                <p className="text-3xl font-bold text-yellow-600">{stats?.pendingBookings}</p>
              </div>

              <div className="card">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Завершено</h3>
                <p className="text-3xl font-bold text-green-600">{stats?.completedBookings}</p>
              </div>
            </div>

            {/* Bookings Management */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">Управление бронированиями</h2>

              {bookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет бронирований</p>
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
                          <td className="py-4 px-4 space-x-2">
                            {booking.status !== 'confirmed' && (
                              <button className="text-green-600 hover:underline text-sm font-semibold">
                                Одобрить
                              </button>
                            )}
                            <button className="text-red-600 hover:underline text-sm font-semibold">
                              Отклонить
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Management Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              {/* Users Management */}
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-xl font-bold text-primary mb-4">Управление пользователями</h2>
                <p className="text-gray-600 mb-4">Placeholder для управления пользователями</p>
                <button className="btn-primary">
                  Управлять пользователями
                </button>
              </div>

              {/* Services Management */}
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-xl font-bold text-primary mb-4">Управление услугами</h2>
                <p className="text-gray-600 mb-4">Placeholder для управления услугами</p>
                <button className="btn-primary">
                  Управлять услугами
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
