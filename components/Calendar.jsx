import { useState } from 'react';

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => null);

  const monthName = currentMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-primary mb-4">Выберите дату</h3>
      
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handlePrevMonth}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-primary hover:text-white transition-colors"
        >
          ←
        </button>
        <h4 className="text-lg font-semibold text-gray-700 capitalize">{monthName}</h4>
        <button
          onClick={handleNextMonth}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-primary hover:text-white transition-colors"
        >
          →
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 text-sm">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="h-10"></div>
        ))}
        {days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDate(day)}
            className={`h-10 rounded-lg font-semibold transition-all ${
              selectedDate === day
                ? 'bg-primary text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-blue-100'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {selectedDate && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            Выбранная дата: <span className="font-semibold text-primary">{selectedDate} {monthName}</span>
          </p>
        </div>
      )}
    </div>
  );
}
