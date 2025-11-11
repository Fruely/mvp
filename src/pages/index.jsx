import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ServiceCard from '@/components/ServiceCard';
import { fetchServices } from '@/utils/api';

export default function Home() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await fetchServices();
        setServices(data);
      } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary to-blue-600 text-white py-20">
          <div className="container-custom">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Ваше здоровье и благополучие
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Найдите лучшие услуги массажа, йоги, фитнеса и консультаций в одном месте
              </p>
              <button className="bg-white text-primary px-8 py-4 rounded-lg font-bold hover:scale-105 transition-transform duration-200 shadow-lg">
                Начать поиск
              </button>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20 container-custom">
          <h2 className="section-title">Наши услуги</h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="h-48 bg-gray-300 rounded-lg mb-4"></div>
                  <div className="h-6 bg-gray-300 rounded mb-3"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="h-10 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <ServiceCard
                  key={service.id}
                  {...service}
                />
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="bg-blue-50 py-16 container-custom">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Не нашли нужную услугу?
            </h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              Свяжитесь с нами, и мы подберем идеальное решение для вас
            </p>
            <button className="btn-primary">
              Написать нам
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
