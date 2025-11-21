import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Calendar from '@/components/Calendar';
import BookingForm from '@/components/BookingForm';

export default function Booking() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow container-custom py-12">
        <h1 className="section-title mb-12">Запись на услугу</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <div>
            <h2 className="text-2xl font-bold text-primary mb-4">Шаг 1: Выберите дату</h2>
            <Calendar />
          </div>

          {/* Booking Form Section */}
          <div>
            <h2 className="text-2xl font-bold text-primary mb-4">Шаг 2: Заполните форму</h2>
            <BookingForm />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Как это работает?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-4 font-bold">
                1
              </div>
              <h3 className="font-bold text-lg text-primary mb-2">Выберите услугу</h3>
              <p className="text-gray-600">
                На главной странице выберите интересующую вас услугу
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-4 font-bold">
                2
              </div>
              <h3 className="font-bold text-lg text-primary mb-2">Забронируйте дату</h3>
              <p className="text-gray-600">
                Выберите удобную для вас дату и время в календаре
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-4 font-bold">
                3
              </div>
              <h3 className="font-bold text-lg text-primary mb-2">Получите подтверждение</h3>
              <p className="text-gray-600">
                Мы отправим вам ссылку и деньги на подтверждение записи
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
