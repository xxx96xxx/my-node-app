
const { Writable } = require('node:stream');

console.log('=== Демонстрация Writable-потока ===');

const chunks = [
    'Группа: ББМО-01-23',
    'Студент: Максим',
    'Лабораторная работа: №21',
    'Тема: Потоки в Node.js'
];

let writtenCount = 0;
let index = 0;

const writable = new Writable({
    highWaterMark: 16,

    write(chunk, encoding, callback) {
        const text = chunk.toString();
        
        setTimeout(() => {
            writtenCount++;
            console.log(`[WRITE] ${text}`);
            callback();
        }, 150);
    }
});

writable.on('drain', () => {
    console.log('[DRAIN] Буфер освобождён, продолжаем запись');
    writeNext();
});

writable.on('finish', () => {
    console.log('[FINISH] Все данные записаны');
    console.log(`Всего записано: ${writtenCount} чанка`);
});

writable.on('error', (error) => {
    console.error('[ERROR]', error.message);
});

function writeNext() {
    while (index < chunks.length) {
        const chunk = chunks[index];
        index++;

        const canContinue = writable.write(chunk, 'utf8');

        console.log(`write() вернул: ${canContinue}`);

        if (!canContinue) {
            console.log('[BACKPRESSURE] Буфер заполнен, приостанавливаем запись');
            return;
        }
    }

    writable.end();
}

writeNext();
