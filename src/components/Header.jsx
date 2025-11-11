import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold text-primary">Froyle</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex gap-8">
            <Link href="/" className="text-gray-600 hover:text-primary transition-colors">
              Услуги
            </Link>
            <Link href="/booking" className="text-gray-600 hover:text-primary transition-colors">
              Запись
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-primary transition-colors">
              Личный кабинет
            </Link>
            <Link href="/admin" className="text-gray-600 hover:text-primary transition-colors">
              Админ
            </Link>
          </nav>

          {/* Language Selector */}
          <div className="flex gap-4 items-center">
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:border-primary transition-colors cursor-pointer">
              <option value="ru">РУ</option>
              <option value="en">EN</option>
              <option value="de">DE</option>
            </select>
            <button className="btn-primary hidden sm:block">Войти</button>
          </div>
        </div>
      </div>
    </header>
  );
}
