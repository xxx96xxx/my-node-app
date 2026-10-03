
const EventEmitter = require('node:events');

class DatabaseConnection extends EventEmitter {
    constructor(user) {
        super();
        this.user = user;
        this.connected = false;
    }

    connect() {
        console.log(`[${this.user}] Подключение к БД...`);
        this.connected = true;
        this.emit('connect');
    }

    query(sql) {
        if (!this.connected) {
            this.error('Нет подключения к базе данных');
            return;
        }

        let result;

        if (sql.startsWith('SELECT')) {
            result = '50 записей';
        } else if (sql.startsWith('INSERT')) {
            result = '1 запись добавлена';
        } else {
            result = 'Запрос выполнен';
        }

        this.emit('query', sql, result);
    }

    close() {
        if (this.connected) {
            this.emit('closing');
            this.connected = false;
            this.emit('close');
        }
    }

    error(message) {
        this.emit('error', new Error(message));
    }
}

const db = new DatabaseConnection('Максим');

console.log('=== DatabaseConnection (группа ББМО-01-23) ===');

// Подписка на события
db.on('connect', () => {
    console.log('[EVENT] Соединение установлено');
});

db.on('query', (sql, result) => {
    console.log(`[EVENT] Выполнение запроса: ${sql}`);
    console.log(`[EVENT] Результат: ${result}`);
});

db.on('closing', () => {
    console.log('[EVENT] Закрытие соединения');
});

db.on('close', () => {
    console.log('[EVENT] Соединение закрыто');
});

// Обработчик ошибки обязателен для события error
db.on('error', (err) => {
    console.log(`[EVENT] Ошибка: ${err.message}`);
});

// Последовательность операций
db.connect();
db.query('SELECT * FROM students');
db.query('INSERT INTO students');
db.close();

console.log('\n=== Демонстрация ошибки ===');
db.error('Connection timeout');

console.log('(без слушателя error — Node.js выбросит исключение)');

// Отдельный режим для демонстрации необработанной ошибки
if (process.argv.includes('--unhandled-error')) {
    console.log('\n=== Ошибка без слушателя ===');

    const unsafeEmitter = new EventEmitter();
    unsafeEmitter.emit('error', new Error('Connection timeout'));
}
