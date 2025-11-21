import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Компания */}
          <div>
            <h3 className="font-bold mb-4">Froyle</h3>
            <p className="text-gray-400 text-sm">
              Платформа для бронирования услуг здоровья и благополучия
            </p>
          </div>

          {/* Услуги */}
          <div>
            <h4 className="font-semibold mb-4">Услуги</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Массаж</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Йога</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Фитнес</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Консультации</Link></li>
            </ul>
          </div>

          {/* Компания */}
          <div>
            <h4 className="font-semibold mb-4">Компания</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">О нас</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Блог</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Карьера</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Контакты</Link></li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h4 className="font-semibold mb-4">Контакты</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Email: <a href="mailto:info@froyle.com" className="hover:text-white transition-colors">info@froyle.com</a></li>
              <li>Телефон: <a href="tel:+1234567890" className="hover:text-white transition-colors">+1 (234) 567-890</a></li>
              <li>Адрес: Улица, Город, Страна</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
            <p>&copy; 2025 Froyle. Все права защищены.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/" className="hover:text-white transition-colors">Политика конфиденциальности</Link>
              <Link href="/" className="hover:text-white transition-colors">Условия использования</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
