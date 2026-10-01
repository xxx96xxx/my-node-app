
const os = require('node:os');

// Получение информации о процессоре
const cpus = os.cpus();
const cpuCount = cpus.length;
const cpuModel = cpus[0]?.model || 'Неизвестно';

const frequencies = cpus.map((cpu, index) => ({
    core: index + 1,
    speed: cpu.speed
}));

const averageFrequency = frequencies.reduce(
    (sum, cpu) => sum + cpu.speed,
    0
) / cpuCount;

// Получение информации об оперативной памяти
const totalMemory = os.totalmem();
const freeMemory = os.freemem();
const usedMemory = totalMemory - freeMemory;

const totalGB = totalMemory / (1024 ** 3);
const freeGB = freeMemory / (1024 ** 3);
const usedGB = usedMemory / (1024 ** 3);

const usedPercent = (usedMemory / totalMemory) * 100;
const freePercent = (freeMemory / totalMemory) * 100;

// Средняя загрузка системы
const platform = os.platform();
const loadAverage = os.loadavg();

// Вывод информации о процессоре
console.log('=== Информация о процессоре ===');
console.log(`Количество логических ядер: ${cpuCount}`);
console.log(`Модель процессора: ${cpuModel}`);

console.log('Частота каждого ядра:');
frequencies.forEach(cpu => {
    console.log(`Ядро ${cpu.core}: ${cpu.speed} МГц`);
});

console.log(`Средняя частота: ${averageFrequency.toFixed(0)} МГц`);

// Вывод информации о памяти
console.log('\n=== Информация о памяти ===');
console.log(`Общий объём: ${totalGB.toFixed(2)} ГБ`);
console.log(`Свободно: ${freeGB.toFixed(2)} ГБ`);
console.log(
    `Использовано: ${usedGB.toFixed(2)} ГБ (${usedPercent.toFixed(1)}%)`
);

// Информация о загрузке системы
console.log('\n=== Средняя загрузка системы ===');

if (platform === 'win32') {
    console.log('Средняя загрузка: недоступна в Windows');
} else {
    console.log(`За 1 минуту: ${loadAverage[0].toFixed(2)}`);
    console.log(`За 5 минут: ${loadAverage[1].toFixed(2)}`);
    console.log(`За 15 минут: ${loadAverage[2].toFixed(2)}`);
}

// Информация о группе
console.log('\nГруппа: ББМО-01-23');

// Предупреждение при низком объёме свободной памяти
if (freePercent < 100) {
    console.log('⚠ ВНИМАНИЕ: свободной оперативной памяти меньше 20%!');
} else {
    console.log('Память в норме');
}
