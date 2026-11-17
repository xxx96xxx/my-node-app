
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: './lab22/.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function main() {
    try {
        console.log('=== СОЗДАНИЕ ТАБЛИЦЫ ===');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                group_name VARCHAR(20) NOT NULL,
                course INT NOT NULL,
                grade DECIMAL(3,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
            DEFAULT CHARSET=utf8mb4
        `);

        console.log('Таблица students создана');

        console.log('\n=== INSERT ===');

        const [insertOne] = await pool.execute(
            `INSERT INTO students (name, group_name, course, grade)
             VALUES (?, ?, ?, ?)`,
            ['Максим', 'ББМО-01-23', 3, 4.50]
        );

        const studentId = insertOne.insertId;

        console.log(
            `Добавлен студент: id=${studentId}, affectedRows=${insertOne.affectedRows}`
        );

        const students = [
            ['Алексей', 'ББМО-01-23', 2, 3.80],
            ['Дмитрий', 'ББМО-01-23', 3, 4.20],
            ['Андрей', 'ББМО-01-23', 2, 4.70]
        ];

        const [insertMany] = await pool.query(
            `INSERT INTO students (name, group_name, course, grade)
             VALUES ?`,
            [students]
        );

        console.log(
            `Добавлено несколько студентов: affectedRows=${insertMany.affectedRows}`
        );

        console.log('\n=== SELECT: ВСЕ СТУДЕНТЫ ===');

        const [allStudents] = await pool.execute(
            'SELECT * FROM students ORDER BY id'
        );

        console.table(allStudents);

        console.log('\n=== SELECT: ФИЛЬТР ПО ГРУППЕ ===');

        const [groupStudents] = await pool.execute(
            `SELECT id, name, group_name, course, grade
             FROM students
             WHERE group_name = ?
             ORDER BY grade DESC`,
            ['ББМО-01-23']
        );

        console.table(groupStudents);

        console.log('\n=== SELECT: ПАГИНАЦИЯ ===');

        const limit = 2;
        const offset = 0;

        const [pageStudents] = await pool.execute(
            `SELECT id, name, group_name, course, grade
             FROM students
             ORDER BY id
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        console.table(pageStudents);

        console.log('\n=== UPDATE ===');

        const [updateResult] = await pool.execute(
            'UPDATE students SET grade = ? WHERE id = ?',
            [4.90, studentId]
        );

        console.log(
            `Изменение оценки: affectedRows=${updateResult.affectedRows}, changedRows=${updateResult.changedRows}`
        );

        const [sameUpdate] = await pool.execute(
            'UPDATE students SET grade = ? WHERE id = ?',
            [4.90, studentId]
        );

        console.log(
            `Повторное обновление тем же значением: affectedRows=${sameUpdate.affectedRows}, changedRows=${sameUpdate.changedRows}`
        );

        console.log('\n=== DELETE ===');

        const [deleteResult] = await pool.execute(
            'DELETE FROM students WHERE id = ?',
            [studentId]
        );

        console.log(
            `Удалён студент id=${studentId}: affectedRows=${deleteResult.affectedRows}`
        );

        console.log('\n=== ЗАЩИТА ОТ SQL-ИНЪЕКЦИИ ===');

        const maliciousInput = "' OR '1'='1";

        // Небезопасный вариант — только демонстрируем сформированную строку.
        const unsafeSql =
            `SELECT * FROM students WHERE name = '${maliciousInput}'`;

        console.log('Пример небезопасного SQL:');
        console.log(unsafeSql);

        // Безопасный вариант: значение передаётся отдельно от SQL.
        const [safeRows] = await pool.execute(
            'SELECT * FROM students WHERE name = ?',
            [maliciousInput]
        );

        console.log(
            `Параметризованный запрос выполнен. Найдено записей: ${safeRows.length}`
        );

        console.log('\nCRUD-операции завершены');

    } catch (error) {
        console.error('Ошибка:', error.code || error.message);
    } finally {
        await pool.end();
        console.log('Пул соединений закрыт');
    }
}

main();
