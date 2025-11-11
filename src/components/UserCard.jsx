export default function UserCard({ user = {}, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-12 bg-gray-300 rounded-lg mb-4"></div>
        <div className="h-4 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 rounded mb-2"></div>
      </div>
    );
  }

  const {
    name = 'Иван Петров',
    email = 'ivan@example.com',
    phone = '+7 (999) 123-45-67',
    avatar = '👤',
    memberSince = '2025-01-15',
    bookingCount = 5,
    totalSpent = '15000 ₽',
  } = user;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-3xl">
            {avatar}
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary">{name}</h3>
            <p className="text-sm text-gray-500">Участник с {memberSince}</p>
          </div>
        </div>
        <button className="btn-secondary text-sm py-2 px-4">
          Редактировать
        </button>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
        <div>
          <p className="text-sm text-gray-600 mb-1">Email</p>
          <p className="text-gray-900 font-semibold">{email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Телефон</p>
          <p className="text-gray-900 font-semibold">{phone}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-primary">{bookingCount}</p>
          <p className="text-sm text-gray-600">Всего записей</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-primary">{totalSpent}</p>
          <p className="text-sm text-gray-600">Потрачено</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button className="btn-primary flex-1">
          Мои записи
        </button>
        <button className="btn-secondary flex-1">
          История
        </button>
      </div>
    </div>
  );
}
