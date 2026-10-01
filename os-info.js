
const os = require('node:os');

// Форматирование времени работы системы
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours} ч ${minutes} мин ${secs} сек`;
}

// Определение операционной системы
function getPlatformName(platform) {
    switch (platform) {
        case 'win32':
            return 'Вы работаете в Windows';
        case 'linux':
            return 'Вы работаете в Linux';
        case 'darwin':
            return 'Вы работаете в macOS';
        default:
            return 'Неизвестная платформа';
    }
}

// Получение информации об ОС
const platform = os.platform();
const type = os.type();
const architecture = os.arch();
const release = os.release();
const hostname = os.hostname();
const uptime = os.uptime();

// Вывод результатов
console.log('=== Информация о системе (группа ББМО-01-23) ===');
console.log(`Платформа: ${platform}`);
console.log(`Тип ОС: ${type}`);
console.log(`Архитектура: ${architecture}`);
console.log(`Версия ОС: ${release}`);
console.log(`Имя хоста: ${hostname}`);
console.log(`Время работы: ${formatUptime(uptime)}`);
console.log('');
console.log(getPlatformName(platform));
