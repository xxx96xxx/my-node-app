
const EventEmitter = require('node:events');

class PluginManager extends EventEmitter {
    constructor() {
        super();

        // Отключаем предупреждение при большом количестве слушателей
        this.setMaxListeners(0);

        // Логирование добавления слушателей
        this.on('newListener', (eventName, listener) => {
            if (eventName !== 'newListener') {
                console.log(
                    `[newListener] Добавлен слушатель "${eventName}"`
                );
            }
        });

        // Логирование удаления слушателей
        this.on('removeListener', (eventName, listener) => {
            if (eventName !== 'leak') {
                console.log(
                    `[removeListener] Удалён слушатель "${eventName}"`
                );
            }
        });

        this.plugins = new Map();
    }

    registerPlugin(name, eventName, listener) {
        this.plugins.set(name, { eventName, listener });
        this.on(eventName, listener);

        this.emit('plugin:registered', name);
    }

    removePlugin(name) {
        const plugin = this.plugins.get(name);

        if (!plugin) {
            return;
        }

        this.removeListener(plugin.eventName, plugin.listener);
        this.plugins.delete(name);

        this.emit('plugin:removed', name);
    }
}

console.log('=== Система плагинов ===');

const manager = new PluginManager();

manager.on('plugin:registered', (name) => {
    console.log(`[PLUGIN] Зарегистрирован: ${name}`);
});

manager.on('plugin:removed', (name) => {
    console.log(`[PLUGIN] Удалён: ${name}`);
});

// Плагин LoggerPlugin
function loggerPlugin(message) {
    console.log(`[LoggerPlugin] ${message}`);
}

// Плагин AlertPlugin
function alertPlugin(message) {
    console.log(`[AlertPlugin] ${message}`);
}

// Регистрация плагинов
manager.registerPlugin('LoggerPlugin', 'log', loggerPlugin);
manager.registerPlugin('AlertPlugin', 'alert', alertPlugin);

// Проверка работы плагинов
manager.emit('log', 'Сообщение от Максима');
manager.emit('alert', 'Проверка уведомления');

// Удаление плагина
manager.removePlugin('LoggerPlugin');

console.log('\n=== Демонстрация утечки ===');

const leakEmitter = new EventEmitter();
leakEmitter.setMaxListeners(0);

function leakListener() {}

for (let i = 0; i < 10; i++) {
    leakEmitter.on('leak', leakListener);
}

console.log(
    'Слушателей до:',
    leakEmitter.listenerCount('leak')
);

for (let i = 0; i < 1000; i++) {
    leakEmitter.on('leak', () => {});
}

console.log(
    'Слушателей после добавления 1000:',
    leakEmitter.listenerCount('leak')
);

// Удаление всех слушателей устраняет накопление
leakEmitter.removeAllListeners('leak');

console.log(
    'Слушателей после removeAllListeners:',
    leakEmitter.listenerCount('leak')
);

console.log('\n=== Асинхронные слушатели ===');

manager.on('async-task', async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(
        '[BBMO-01-23] async-слушатель завершён через 100ms'
    );
});

setImmediate(() => {
    manager.emit('async-task');

    console.log(
        '[BBMO-01-23] emit вызван (не ждёт async-слушатель)'
    );
});
