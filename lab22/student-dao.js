
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

class StudentDAO {
    constructor(pool) {
        this.pool = pool;
    }

    validate(data) {
        if (data.name !== undefined &&
            (typeof data.name !== 'string' ||
             data.name.trim().length < 2 ||
             data.name.trim().length > 100)) {
            throw new Error('Имя должно содержать от 2 до 100 символов');
        }

        if (data.group_name !== undefined &&
            !/^ББМО-\d{2}-\d{2}$/u.test(data.group_name)) {
            throw new Error('Неверный формат группы. Пример: ББМО-01-23');
        }

        if (data.course !== undefined &&
            (!Number.isInteger(Number(data.course)) ||
             Number(data.course) < 1 ||
             Number(data.course) > 4)) {
            throw new Error('Курс должен быть от 1 до 4');
        }

        if (data.grade !== undefined &&
            data.grade !== null &&
            (Number(data.grade) < 0 || Number(data.grade) > 5)) {
            throw new Error('Оценка должна быть от 0 до 5 или NULL');
        }
    }

    async create(student) {
        this.validate(student);

        const { name, group_name, course, grade = null } = student;

        const [result] = await this.pool.execute(
            `INSERT INTO students (name, group_name, course, grade)
             VALUES (?, ?, ?, ?)`,
            [name.trim(), group_name, Number(course), grade]
        );

        return this.findById(result.insertId);
    }

    async findById(id) {
        const [rows] = await this.pool.execute(
            'SELECT * FROM students WHERE id = ?',
            [Number(id)]
        );

        return rows[0] || null;
    }

    async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            group_name,
            course,
            sortBy = 'id',
            sortOrder = 'ASC'
        } = options;

        const allowedSortFields = ['id', 'name', 'group_name', 'course', 'grade', 'created_at'];

        if (!allowedSortFields.includes(sortBy)) {
            throw new Error('Недопустимое поле сортировки');
        }

        const order = String(sortOrder).toUpperCase();
        if (!['ASC', 'DESC'].includes(order)) {
            throw new Error('Порядок сортировки должен быть ASC или DESC');
        }

        const currentPage = Math.max(1, Number(page));
        const pageLimit = Math.min(100, Math.max(1, Number(limit)));
        const offset = (currentPage - 1) * pageLimit;

        const conditions = [];
        const params = [];

        if (group_name) {
            conditions.push('group_name = ?');
            params.push(group_name);
        }

        if (course !== undefined && course !== '') {
            conditions.push('course = ?');
            params.push(Number(course));
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const [rows] = await this.pool.execute(
            `SELECT * FROM students ${where}
             ORDER BY ${sortBy} ${order}
             LIMIT ? OFFSET ?`,
            [...params, pageLimit, offset]
        );

        const [countRows] = await this.pool.execute(
            `SELECT COUNT(*) AS total FROM students ${where}`,
            params
        );

        const total = Number(countRows[0].total);

        return {
            data: rows,
            pagination: {
                page: currentPage,
                limit: pageLimit,
                total,
                totalPages: Math.ceil(total / pageLimit)
            }
        };
    }

    async update(id, changes) {
        const allowedFields = ['name', 'group_name', 'course', 'grade'];
        const fields = Object.keys(changes);

        if (fields.length === 0) {
            throw new Error('Не указаны поля для обновления');
        }

        for (const field of fields) {
            if (!allowedFields.includes(field)) {
                throw new Error(`Изменение поля ${field} запрещено`);
            }
        }

        this.validate(changes);

        const values = [];
        const setParts = [];

        for (const field of fields) {
            setParts.push(`${field} = ?`);
            values.push(
                field === 'name' && typeof changes[field] === 'string'
                    ? changes[field].trim()
                    : changes[field]
            );
        }

        values.push(Number(id));

        await this.pool.execute(
            `UPDATE students SET ${setParts.join(', ')} WHERE id = ?`,
            values
        );

        return this.findById(id);
    }

    async delete(id) {
        const [result] = await this.pool.execute(
            'DELETE FROM students WHERE id = ?',
            [Number(id)]
        );

        return result.affectedRows > 0;
    }

    async search(searchText) {
        const value = `%${searchText}%`;

        const [rows] = await this.pool.execute(
            `SELECT * FROM students
             WHERE name LIKE ? OR group_name LIKE ?
             ORDER BY name ASC`,
            [value, value]
        );

        return rows;
    }

    async getStats() {
        const [rows] = await this.pool.execute(
            `SELECT
                COUNT(*) AS total_students,
                COUNT(grade) AS graded_students,
                ROUND(AVG(grade), 2) AS average_grade,
                MIN(grade) AS min_grade,
                MAX(grade) AS max_grade
             FROM students`
        );

        const [groups] = await this.pool.execute(
            `SELECT group_name, COUNT(*) AS students_count
             FROM students
             GROUP BY group_name
             ORDER BY group_name`
        );

        return {
            general: rows[0],
            byGroup: groups
        };
    }
}

async function main() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    const dao = new StudentDAO(pool);
    let createdStudentId = null;

    try {
        console.log('=== StudentDAO: работа с MySQL ===');

        // Добавление студента
        const created = await dao.create({
            name: 'Максим DAO',
            group_name: 'ББМО-01-23',
            course: 3,
            grade: 4.5
        });

        createdStudentId = created.id;
        console.log('\nДобавленный студент:');
        console.log(created);

        // Поиск по ID
        console.log('\nПоиск по ID:');
        console.log(await dao.findById(createdStudentId));

        // Получение списка с пагинацией и фильтрацией
        console.log('\nСписок студентов группы:');
        console.log(await dao.findAll({
            page: 1,
            limit: 5,
            group_name: 'ББМО-01-23',
            sortBy: 'grade',
            sortOrder: 'DESC'
        }));

        // Изменение данных
        console.log('\nОбновление студента:');
        console.log(await dao.update(createdStudentId, {
            name: 'Максим DAO',
            grade: 5
        }));

        // Поиск по имени или группе
        console.log('\nРезультаты поиска:');
        console.log(await dao.search('Максим'));

        // Статистика
        console.log('\nСтатистика:');
        console.log(await dao.getStats());

        // Удаление тестовой записи
        console.log('\nУдаление тестового студента:');
        console.log(await dao.delete(createdStudentId));
        createdStudentId = null;

        // Проверка валидации
        console.log('\nПроверка валидации:');
        try {
            await dao.create({
                name: 'М',
                group_name: 'НЕВЕРНАЯ-ГРУППА',
                course: 8,
                grade: 7
            });
        } catch (error) {
            console.log('Ожидаемая ошибка:', error.message);
        }

        console.log('\nРабота StudentDAO завершена.');
    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        if (createdStudentId !== null) {
            await dao.delete(createdStudentId).catch(() => {});
        }

        await pool.end();
    }
}

main();
