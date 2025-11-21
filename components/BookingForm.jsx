import { useState } from 'react';

export default function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'massage',
    date: '',
    time: '',
    notes: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Ваша запись принята! Мы свяжемся с вами в ближайшее время.');
    setFormData({
      name: '',
      email: '',
      phone: '',
      service: 'massage',
      date: '',
      time: '',
      notes: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-lg mx-auto">
      <h3 className="section-title">Форма записи на услугу</h3>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          ФИО *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Иван Петров"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Email */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Email *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="ivan@example.com"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Phone */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Телефон *
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+7 (999) 123-45-67"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Service */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Услуга *
        </label>
        <select
          name="service"
          value={formData.service}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="massage">Классический массаж</option>
          <option value="yoga">Йога</option>
          <option value="fitness">Фитнес</option>
          <option value="consultation">Консультация</option>
        </select>
      </div>

      {/* Date */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Дата *
        </label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Time */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Время *
        </label>
        <input
          type="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Дополнительные пожелания
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Опишите ваши пожелания или особенности..."
          rows="3"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        ></textarea>
      </div>

      {/* Submit Button */}
      <button type="submit" className="btn-primary w-full">
        Подтвердить запись
      </button>
    </form>
  );
}
