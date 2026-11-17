
const mysql = require('mysql2/promise');
const mysqlCallback = require('mysql2');
const dotenv = require('dotenv');

dotenv.config({ path: './lab22/.env' });

const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

const pool = mysql.createPool({
    ...config,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
});

function logError(error) {
    console.log(`[${error.code || 'ERROR'}] ${error.message}`);
}

async function demonstrateErrors() {
    console.log('\n=== ДЕМОНСТРАЦИЯ ОШИБОК ===');

    // 1. Несуществующий порт — сетевая ошибка
    try {
        const badConnection = await mysql.createConnection({
            ...config,
            port: 9999,
            connectTimeout: 3000
        });
        await badConnection.end();
    } catch (error) {
        logError(error);
    }

    // 2. Неверный пароль
    try {
        const badConnection = await mysql.createConnection({
            ...config,
            password: 'wrong_password',
            connectTimeout: 3000
        });
        await badConnection.end();
    } catch (error) {
        logError(error);
    }

    // 3. Ошибка синтаксиса SQL
    try {
        await pool.query('SELECT * FRM students');
    } catch (error) {
        logError(error);
    }

    // 4. Ошибка дублирования уникального значения
    await pool.query(`
        CREATE TABLE IF NOT EXISTS error_demo (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE
        ) ENGINE=InnoDB
    `);

    await pool.query('DELETE FROM error_demo');

    await pool.execute(
        'INSERT INTO error_demo (code) VALUES (?)',
        ['DUPLICATE-1']
    );

    try {
        await pool.execute(
            'INSERT INTO error_demo (code) VALUES (?)',
            ['DUPLICATE-1']
        );
    } catch (error) {
        logError(error);
    }

    // 5. NULL в поле NOT NULL
    try {
        await pool.execute(
            'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
            [null, 'ББМО-01-23', 2, 4.0]
        );
    } catch (error) {
        logError(error);
    }
}

async function prepareBigData() {
    console.log('\n=== ПОДГОТОВКА BIG_DATA ===');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS big_data (
            id INT PRIMARY KEY,
            student_name VARCHAR(100) NOT NULL,
            grade DECIMAL(3,2) NOT NULL
        ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
    `);

    const [countRows] = await pool.query(
        'SELECT COUNT(*) AS total FROM big_data'
    );

    if (countRows[0].total >= 100000) {
        console.log('В таблице уже есть не менее 100000 записей');
        return;
    }

    await pool.query('DELETE FROM big_data');

    console.log('Добавление 100000 записей...');

    const batchSize = 1000;

    for (let start = 1; start <= 100000; start += batchSize) {
        const values = [];

        for (let id = start; id < start + batchSize; id++) {
            values.push([
                id,
                `Студент Максим ${id}`,
                Number((2 + (id % 31) / 10).toFixed(2))
            ]);
        }

        await pool.query(
            'INSERT INTO big_data (id, student_name, grade) VALUES ?',
            [values]
        );

        if (start % 10000 === 1) {
            console.log(`Создано записей: ${start}`);
        }
    }

    console.log('✔ Добавлено 100000 записей');
}

async function readAllAtOnce() {
    console.log('\n=== SELECT ЦЕЛИКОМ ===');

    const before = process.memoryUsage().heapUsed;
    const start = Date.now();

    const [rows] = await pool.query(
        'SELECT * FROM big_data'
    );

    const elapsed = (Date.now() - start) / 1000;
    const after = process.memoryUsage().heapUsed;
    const memoryMb = (after - before) / 1024 / 1024;

    console.log(`Получено записей: ${rows.length}`);
    console.log(`Время: ${elapsed.toFixed(2)} сек`);
    console.log(`Изменение heap: ${memoryMb.toFixed(2)} МБ`);

    return rows.length;
}

async function readAsStream() {
    console.log('\n=== ПОТОКОВОЕ ЧТЕНИЕ ===');

    const connection = mysqlCallback.createConnection(config);
    const start = Date.now();
    const before = process.memoryUsage().heapUsed;

    let count = 0;

    await new Promise((resolve, reject) => {
        const query = connection.query(
            'SELECT * FROM big_data'
        );

        const stream = query.stream({ highWaterMark: 100 });

        stream.on('data', (row) => {
            count++;

            if (count % 10000 === 0) {
                console.log(
                    `[STREAM] Получено: ${count} (${(count / 1000).toFixed(0)}%)`
                );
            }
        });

        stream.on('end', resolve);
        stream.on('error', reject);
    });

    const elapsed = (Date.now() - start) / 1000;
    const after = process.memoryUsage().heapUsed;

    console.log(`✔ Обработано записей: ${count}`);
    console.log(`Время: ${elapsed.toFixed(2)} сек`);
    console.log(
        `Изменение heap: ${((after - before) / 1024 / 1024).toFixed(2)} МБ`
    );

    await new Promise((resolve, reject) => {
        connection.end((error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

async function demonstrateTransaction() {
    console.log('\n=== ТРАНЗАКЦИЯ ===');

    const connection = await pool.getConnection();

    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS transaction_demo (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                description VARCHAR(100)
            ) ENGINE=InnoDB
        `);

        await connection.query('DELETE FROM transaction_demo');

        await connection.beginTransaction();
        console.log('Транзакция начата');

        await connection.execute(
            'INSERT INTO transaction_demo (code, description) VALUES (?, ?)',
            ['TX-001', 'Первая запись']
        );
        console.log('✔ INSERT 1 выполнен');

        await connection.execute(
            'INSERT INTO transaction_demo (code, description) VALUES (?, ?)',
            ['TX-002', 'Вторая запись']
        );
        console.log('✔ INSERT 2 выполнен');

        try {
            // Повтор кода TX-001 вызовет ER_DUP_ENTRY
            await connection.execute(
                'INSERT INTO transaction_demo (code, description) VALUES (?, ?)',
                ['TX-001', 'Дубликат']
            );
        } catch (error) {
            console.log(`✖ INSERT 3 не выполнен: ${error.code}`);
            throw error;
        }

        await connection.commit();
        console.log('COMMIT выполнен');
    } catch (error) {
        await connection.rollback();
        console.log('ROLLBACK выполнен');
    } finally {
        connection.release();
        console.log('Соединение возвращено в пул');
    }

    const [rows] = await pool.query(
        'SELECT * FROM transaction_demo'
    );

    console.log(`Записей после транзакции: ${rows.length}`);
}

async function main() {
    pool.on('error', (error) => {
        console.error('[POOL ERROR]', error.code, error.message);
    });

    try {
        await demonstrateErrors();
        await prepareBigData();
        await readAllAtOnce();
        await readAsStream();
        await demonstrateTransaction();

        console.log('\n=== ЗАДАНИЕ 3 ЗАВЕРШЕНО ===');
    } catch (error) {
        console.error('Критическая ошибка:', error.code || error.message);
    } finally {
        await pool.end();
        console.log('Пул соединений закрыт');
    }
}

main();
