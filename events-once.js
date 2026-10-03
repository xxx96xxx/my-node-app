
const EventEmitter = require('node:events');

const emitter = new EventEmitter();

console.log('=== Сравнение on и once ===');

let onCount = 0;
let onceCount = 0;

// Обычный слушатель вызывается при каждом событии
emitter.on('tick', () => {
    onCount++;
    console.log(`[tick #${onCount}] on-слушатель`);
});

// Одноразовый слушатель вызывается только один раз
emitter.once('tick', () => {
    onceCount++;
    console.log(`[tick #${onCount}] once-слушатель`);
});

// Вызываем событие три раза
emitter.emit('tick');
emitter.emit('tick');
emitter.emit('tick');

console.log(`on-слушатель вызван: ${onCount} раза`);
console.log(`once-слушатель вызван: ${onceCount} раз`);

console.log('\n=== Управление подписками ===');

function firstListener() {
    console.log('Первый слушатель');
}

function secondListener() {
    console.log('Второй слушатель');
}

function thirdListener() {
    console.log('Третий слушатель');
}

emitter.on('message', firstListener);
emitter.on('message', secondListener);
emitter.addListener('message', thirdListener);

console.log(
    'Слушателей до удаления:',
    emitter.listenerCount('message')
);

// Получаем массив слушателей
console.log(
    'Массив слушателей:',
    emitter.listeners('message').length
);

// Удаляем конкретный слушатель
emitter.removeListener('message', secondListener);

console.log(
    'Слушателей после удаления одного:',
    emitter.listenerCount('message')
);

// Удаляем всех слушателей события
emitter.removeAllListeners('message');

console.log(
    'Слушателей после removeAllListeners:',
    emitter.listenerCount('message')
);

console.log('\n=== Порядок вызова ===');

const orderEmitter = new EventEmitter();

orderEmitter.on('order', () => {
    console.log('[1] Первый слушатель (группа ББМО-01-23)');
});

orderEmitter.on('order', () => {
    console.log('[2] Второй слушатель');
});

orderEmitter.on('order', () => {
    console.log('[3] Третий слушатель');
});

orderEmitter.emit('order');
