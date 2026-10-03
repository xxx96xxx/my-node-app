const EventEmitter = require('node:events');

const emitter = new EventEmitter();

console.log('=== Демонстрация EventEmitter ===');

emitter.on('greet', (name) => {
    console.log(`[greet] Привет, ${name}!`);
});

emitter.on('info', () => {
    console.log('[info] Группа: ББМО-01-23');
});

emitter.on('bye', () => {
    console.log('[bye] До свидания!');
});

emitter.emit('greet', 'Максим');
emitter.emit('info');
emitter.emit('bye');

console.log(
    'Событие "unknown" без слушателей:',
    emitter.emit('unknown')
);

console.log(
    'Событие "greet" со слушателями:',
    emitter.emit('greet', 'Максим')
);