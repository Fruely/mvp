#!/bin/bash

# 🚀 QUICK INSTALL SCRIPT
# Автоматическая установка проекта Froyle MVP

echo "🚀 Установка проекта Froyle MVP..."
echo ""

# Проверить Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "Пожалуйста установите Node.js с https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js версия: $(node --version)"
echo "✅ npm версия: $(npm --version)"
echo ""

# Установить зависимости
echo "📦 Установка зависимостей..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Зависимости установлены!"
else
    echo "❌ Ошибка при установке зависимостей"
    exit 1
fi

echo ""
echo "🎉 Установка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo ""
echo "1. Запустить проект:"
echo "   npm run dev"
echo ""
echo "2. Открыть в браузере:"
echo "   http://localhost:3000"
echo ""
echo "3. Прочитать документацию:"
echo "   cat README.md"
echo ""
echo "4. Изучить примеры:"
echo "   cat GETTING_STARTED.md"
echo ""
