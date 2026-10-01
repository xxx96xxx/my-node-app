
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const INTERVAL = 2000;
const MEMORY_LIMIT = 100;
const LOG_FILE = path.join(__dirname, 'monitor.log');

let previousCpus = os.cpus();
let memoryWarningActive = false;
let monitoring = true;

// Расчёт загрузки процессора между двумя измерениями
function getCpuUsage(previous, current) {
    let totalDifference = 0;
    let idleDifference = 0;

    for (let i = 0; i < current.length; i++) {
        const oldTimes = previous[i].times;
        const newTimes = current[i].times;

        const oldTotal = Object.values(oldTimes).reduce((sum, value) => sum + value, 0);
        const newTotal = Object.values(newTimes).reduce((sum, value) => sum + value, 0);

        totalDifference += newTotal - oldTotal;
        idleDifference += newTimes.idle - oldTimes.idle;
    }

    if (totalDifference <= 0) {
        return 0;
    }

    return (1 - idleDifference / totalDifference) * 100;
}

// Форматирование времени работы системы
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days} д ${hours} ч ${minutes} мин ${secs} сек`;
}

// Запись предупреждения в лог
function writeWarning(message) {
    const timestamp = new Date().toLocaleString('ru-RU');
    const logMessage = `[${timestamp}] ПРЕДУПРЕЖДЕНИЕ: ${message}\n`;

    fs.appendFile(LOG_FILE, logMessage, error => {
        if (error) {
            console.error(`Не удалось записать лог: ${error.message}`);
        }
    });
}

// Сбор и вывод системных показателей
function showSystemInfo() {
    if (!monitoring) {
        return;
    }

    const currentCpus = os.cpus();
    const cpuUsage = getCpuUsage(previousCpus, currentCpus);
    previousCpus = currentCpus;

    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const totalGB = totalMemory / (1024 ** 3);
    const freeGB = freeMemory / (1024 ** 3);
    const usedGB = usedMemory / (1024 ** 3);
    const freePercent = (freeMemory / totalMemory) * 100;
    const usedPercent = (usedMemory / totalMemory) * 100;

    // Предупреждение записывается при переходе в состояние низкой памяти.
    if (freePercent < MEMORY_LIMIT && !memoryWarningActive) {
        writeWarning(
            `Свободной оперативной памяти меньше ${MEMORY_LIMIT}%: ${freePercent.toFixed(1)}%`
        );
        memoryWarningActive = true;
    } else if (freePercent >= MEMORY_LIMIT) {
        memoryWarningActive = false;
    }

    console.clear();

    console.log('==============================================');
    console.log('       МОНИТОРИНГ СИСТЕМЫ В РЕАЛЬНОМ ВРЕМЕНИ');
    console.log('==============================================');
    console.log(`Дата и время: ${new Date().toLocaleString('ru-RU')}`);
    console.log(`ОС: ${os.type()} ${os.release()}`);
    console.log(`Компьютер: ${os.hostname()}`);
    console.log('');
    console.log('--- Процессор ---');
    console.log(`Модель: ${currentCpus[0].model}`);
    console.log(`Логических ядер: ${currentCpus.length}`);
    console.log(`Текущая загрузка: ${cpuUsage.toFixed(1)}%`);
    console.log('');
    console.log('--- Оперативная память ---');
    console.log(`Всего: ${totalGB.toFixed(2)} ГБ`);
    console.log(`Использовано: ${usedGB.toFixed(2)} ГБ (${usedPercent.toFixed(1)}%)`);
    console.log(`Свободно: ${freeGB.toFixed(2)} ГБ (${freePercent.toFixed(1)}%)`);

    if (freePercent < MEMORY_LIMIT) {
        console.log('');
        console.log(`ВНИМАНИЕ: свободной памяти меньше ${MEMORY_LIMIT}%!`);
        console.log(`Предупреждение записано в ${LOG_FILE}`);
    } else {
        console.log('');
        console.log('Состояние памяти: в норме');
    }

    console.log('');
    console.log(`Время работы системы: ${formatUptime(os.uptime())}`);
    console.log('');
    console.log(`Обновление каждые ${INTERVAL / 1000} секунды`);
    console.log('Для остановки нажмите Ctrl + C');
}

// Остановка мониторинга
function stopMonitoring() {
    if (!monitoring) {
        return;
    }

    monitoring = false;
    console.log('\nМониторинг остановлен.');
    process.exit(0);
}

console.log('Запуск мониторинга системы...');

process.on('SIGINT', stopMonitoring);

showSystemInfo();
const timer = setInterval(showSystemInfo, INTERVAL);

process.on('exit', () => {
    clearInterval(timer);
});
