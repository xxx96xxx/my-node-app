
const EventEmitter = require('node:events');
const os = require('node:os');
const http = require('node:http');

const GROUP = 'ББМО-01-23';

class EventBus extends EventEmitter {
    constructor() {
        super();

        this.events = new Map();
        this.anyListeners = new Set();
        this.metrics = {
            events: {},
            errors: {},
            total: 0,
            lastCall: null
        };

        this.setMaxListeners(0);
    }

    on(event, listener, priority = 0) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listeners = this.events.get(event);

        listeners.push({
            listener,
            priority,
            once: false,
            order: this.metrics.total + listeners.length
        });

        listeners.sort((a, b) => {
            return b.priority - a.priority || a.order - b.order;
        });

        return this;
    }

    once(event, listener, priority = 0) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listeners = this.events.get(event);

        listeners.push({
            listener,
            priority,
            once: true,
            order: this.metrics.total + listeners.length
        });

        listeners.sort((a, b) => {
            return b.priority - a.priority || a.order - b.order;
        });

        return this;
    }

    onAny(listener) {
        this.anyListeners.add(listener);
        return this;
    }

    off(event, listener) {
        if (!this.events.has(event)) {
            return this;
        }

        const listeners = this.events.get(event).filter(
            item => item.listener !== listener
        );

        if (listeners.length === 0) {
            this.events.delete(event);
        } else {
            this.events.set(event, listeners);
        }

        return this;
    }

    emit(event, ...args) {
        this.metrics.events[event] =
            (this.metrics.events[event] || 0) + 1;

        this.metrics.total++;
        this.metrics.lastCall = new Date().toISOString();

        // Wildcard-слушатели получают имя события и аргументы
        for (const listener of this.anyListeners) {
            try {
                listener(event, ...args);
            } catch (error) {
                this.recordError(event, error);
            }
        }

        const listeners = this.events.get(event);

        if (!listeners || listeners.length === 0) {
            if (event === 'error') {
                console.error(
                    `[ERROR] [${GROUP}]`,
                    args[0]?.message || 'Неизвестная ошибка'
                );
                return false;
            }

            return false;
        }

        // Копия нужна, чтобы безопасно удалять once-слушателей
        for (const item of [...listeners]) {
            if (!this.events.get(event)?.includes(item)) {
                continue;
            }

            if (item.once) {
                this.off(event, item.listener);
            }

            try {
                item.listener(...args);
            } catch (error) {
                this.recordError(event, error);
            }
        }

        return true;
    }

    recordError(event, error) {
        this.metrics.errors[event] =
            (this.metrics.errors[event] || 0) + 1;

        console.error(
            `[ERROR] [${GROUP}] Ошибка в слушателе "${event}":`,
            error.message
        );
    }

    getMetrics() {
        const listeners = {};

        for (const [event, items] of this.events) {
            listeners[event] = items.length;
        }

        return {
            group: GROUP,
            events: { ...this.metrics.events },
            errors: { ...this.metrics.errors },
            total: this.metrics.total,
            lastCall: this.metrics.lastCall,
            listeners
        };
    }
}

const bus = new EventBus();

console.log(`=== EventBus (группа ${GROUP}) ===`);

console.log('\n--- Приоритеты ---');

bus.on('priority', () => {
    console.log('[priority 0] Низкий приоритет');
}, 0);

bus.on('priority', () => {
    console.log('[priority 10] Высокий приоритет');
}, 10);

bus.on('priority', () => {
    console.log('[priority 5] Средний приоритет');
}, 5);

bus.emit('priority');

console.log('\n--- Wildcard ---');

bus.onAny((event, ...args) => {
    console.log(
        `[onAny] Событие "${event}" с аргументами:`,
        JSON.stringify(args)
    );
});

bus.emit('greet', 'Максим');
bus.emit('info', GROUP);

console.log('\n--- Once-кэш ---');

let onceCount = 0;

bus.once('tick', () => {
    onceCount++;
    console.log(`[tick] Вызов ${onceCount}`);
});

bus.on('tick', () => {
    console.log('[tick] Обычный слушатель');
});

bus.emit('tick');
bus.emit('tick');
bus.emit('tick');

console.log(`once-слушатель вызван: ${onceCount} раз`);

console.log('\n--- Обработка ошибок ---');

bus.on('test', () => {
    throw new Error('Тестовая ошибка');
}, 10);

bus.on('test2', () => {
    throw new Error('Ошибка второго слушателя');
}, 10);

bus.emit('test');
bus.emit('test2');

console.log('\n--- Метрики ---');

const metrics = bus.getMetrics();

for (const [event, count] of Object.entries(metrics.events)) {
    const errors = metrics.errors[event] || 0;

    console.log(
        `${event}: ${count} вызова${errors ? ` (${errors} ошибка)` : ''}`
    );
}

console.log(`Всего событий: ${metrics.total}`);
console.log(`Последний вызов: ${metrics.lastCall}`);

console.log('\n--- Мониторинг системы с os ---');

bus.on('system:monitor', (data) => {
    console.log(
        `[SYSTEM] Память: ${data.freeMemory} / ${data.totalMemory} байт`
    );
    console.log(`[SYSTEM] Платформа: ${data.platform}`);
    console.log(`[SYSTEM] Свободная память: ${data.freePercent}%`);
});

const totalMemory = os.totalmem();
const freeMemory = os.freemem();

bus.emit('system:monitor', {
    totalMemory,
    freeMemory,
    platform: os.platform(),
    freePercent: ((freeMemory / totalMemory) * 100).toFixed(2)
});

console.log('\n--- HTTP-сервер ---');

const server = http.createServer((req, res) => {
    bus.emit('request', {
        method: req.method,
        url: req.url
    });

    if (req.url === '/metrics' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify(bus.getMetrics(), null, 2));
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8'
    });

    res.end('EventBus работает. Откройте /metrics');
});

server.listen(3000, () => {
    console.log('HTTP-сервер запущен: http://localhost:3000');
    console.log('Метрики: http://localhost:3000/metrics');
    console.log('Для остановки нажмите Ctrl+C');
});
