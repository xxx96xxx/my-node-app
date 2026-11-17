
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: './lab22/.env' });

const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

function showError(error) {
    if (error.code === 'ECONNREFUSED') {
        console.error('Сервер MySQL недоступен');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Ошибка доступа: проверьте пользователя и пароль');
    } else {
        console.error('Ошибка MySQL:', error.message);
    }
}

async function main() {
    let connection;
    let pool;

    try {
        console.log('=== Одиночное соединение ===');

        connection = await mysql.createConnection(dbConfig);
        console.log('Подключение установлено');

        const [rows] = await connection.query(
            'SELECT VERSION() AS version, DATABASE() AS db, USER() AS user'
        );

        console.log('Версия MySQL:', rows[0].version);
        console.log('Текущая БД:', rows[0].db);
        console.log('Пользователь:', rows[0].user);

        await connection.end();
        connection = null;
        console.log('Одиночное соединение закрыто');

        console.log('\n=== Пул соединений ===');

        pool = mysql.createPool({
            ...dbConfig,
            connectionLimit: 10,
            waitForConnections: true,
            queueLimit: 0
        });

        pool.on('error', (error) => {
            console.error('[POOL ERROR]', error.code, error.message);
        });

        console.log('Пул создан (лимит: 10)');

        const [poolRows] = await pool.query(
            'SELECT VERSION() AS version, DATABASE() AS db, USER() AS user'
        );

        console.log('Версия MySQL:', poolRows[0].version);
        console.log('Текущая БД:', poolRows[0].db);
        console.log('Пользователь:', poolRows[0].user);
        console.log('Запрос через пул выполнен');
        console.log('Пул готов к работе');
    } catch (error) {
        showError(error);
    } finally {
        if (connection) {
            await connection.end().catch(() => {});
        }

        if (pool) {
            await pool.end().catch(() => {});
        }
    }
}

main();
