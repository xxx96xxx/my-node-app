
const { Readable } = require('node:stream');

console.log('=== Демонстрация Readable-потока ===');

const chunks = [
    'Группа: ББМО-01-23',
    'Студент: Максим',
    'Лабораторная работа: №21',
    'Тема: Потоки в Node.js'
];

let index = 0;
let chunkCount = 0;
let totalBytes = 0;

const readable = new Readable({
    read(size) {
        if (index < chunks.length) {
            const chunk = chunks[index];
            index++;

            this.push(chunk);
        } else {
            this.push(null);
        }
    }
});

readable.on('data', (chunk) => {
    chunkCount++;

    const text = chunk.toString();
    totalBytes += chunk.length;

    console.log(`[CHUNK ${chunkCount}] ${text}`);
});

readable.on('end', () => {
    console.log('[END] Поток завершён');
    console.log(`Всего получено чанков: ${chunkCount}`);
    console.log(`Общий размер данных: ${totalBytes} байт`);
});

readable.on('error', (error) => {
    console.error('[ERROR]', error.message);
});
