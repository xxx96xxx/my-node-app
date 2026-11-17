const pool = require('../db');

const cache = new Map();
const CACHE_TTL = 60 * 1000;

const metrics = {
    requests: 0,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0,
    startedAt: Date.now()
};

function clearCache() {
    cache.clear();
}

function validateStudent(data, partial = false) {
    if (!partial || data.name !== undefined) {
        if (typeof data.name !== 'string' ||
            data.name.trim().length < 2 ||
            data.name.trim().length > 100) {
            const error = new Error('Имя должно содержать от 2 до 100 символов');
            error.status = 400;
            throw error;
        }
    }

    if (!partial || data.group_name !== undefined) {
        if (typeof data.group_name !== 'string' ||
            !/^ББМО-\d{2}-\d{2}$/u.test(data.group_name)) {
            const error = new Error('Неверный формат группы. Пример: ББМО-01-23');
            error.status = 400;
            throw error;
        }
    }

    if (!partial || data.course !== undefined) {
        const course = Number(data.course);
        if (!Number.isInteger(course) || course < 1 || course > 4) {
            const error = new Error('Курс должен быть от 1 до 4');
            error.status = 400;
            throw error;
        }
    }

    if (data.grade !== undefined && data.grade !== null) {
        const grade = Number(data.grade);
        if (!Number.isFinite(grade) || grade < 0 || grade > 5) {
            const error = new Error('Оценка должна быть от 0 до 5 или NULL');
            error.status = 400;
            throw error;
        }
    }
}

async function getStudents(ctx) {
    const page = Math.max(1, Number(ctx.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(ctx.query.limit) || 10));
    const offset = (page - 1) * limit;
    const group = ctx.query.group_name;
    const cacheKey = JSON.stringify({ page, limit, group });

    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        metrics.cacheHits++;
        ctx.body = cached.value;
        return;
    }

    metrics.cacheMisses++;

    const conditions = [];
    const params = [];

    if (group) {
        conditions.push('group_name = ?');
        params.push(group);
    }

    const where = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    const [rows] = await pool.execute(
        `SELECT * FROM students ${where}
         ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM students ${where}`,
        params
    );

    const total = Number(countRows[0].total);

    const result = {
        data: rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };

    cache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + CACHE_TTL
    });

    ctx.body = result;
}

async function getStudent(ctx) {
    const id = Number(ctx.params.id);

    if (!Number.isInteger(id) || id < 1) {
        ctx.throw(400, 'Некорректный ID');
    }

    const [rows] = await pool.execute(
        'SELECT * FROM students WHERE id = ?',
        [id]
    );

    if (rows.length === 0) {
        ctx.throw(404, 'Студент не найден');
    }

    ctx.body = rows[0];
}

async function createStudent(ctx) {
    const data = ctx.request.body || {};
    validateStudent(data);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO students (name, group_name, course, grade)
             VALUES (?, ?, ?, ?)`,
            [
                data.name.trim(),
                data.group_name,
                Number(data.course),
                data.grade === undefined ? null : data.grade
            ]
        );

        const [rows] = await connection.execute(
            'SELECT * FROM students WHERE id = ?',
            [result.insertId]
        );

        await connection.commit();

        clearCache();
        ctx.status = 201;
        ctx.body = rows[0];
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function updateStudent(ctx) {
    const id = Number(ctx.params.id);
    const data = ctx.request.body || {};

    if (!Number.isInteger(id) || id < 1) {
        ctx.throw(400, 'Некорректный ID');
    }

    const allowed = ['name', 'group_name', 'course', 'grade'];
    const fields = Object.keys(data);

    if (fields.length === 0) {
        ctx.throw(400, 'Не указаны поля для обновления');
    }

    if (fields.some(field => !allowed.includes(field))) {
        ctx.throw(400, 'Переданы недопустимые поля');
    }

    validateStudent(data, true);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [existing] = await connection.execute(
            'SELECT id FROM students WHERE id = ? FOR UPDATE',
            [id]
        );

        if (existing.length === 0) {
            ctx.throw(404, 'Студент не найден');
        }

        const setParts = [];
        const values = [];

        for (const field of fields) {
            setParts.push(`${field} = ?`);
            values.push(
                field === 'name' ? data[field].trim() : data[field]
            );
        }

        values.push(id);

        await connection.execute(
            `UPDATE students SET ${setParts.join(', ')} WHERE id = ?`,
            values
        );

        const [rows] = await connection.execute(
            'SELECT * FROM students WHERE id = ?',
            [id]
        );

        await connection.commit();

        clearCache();
        ctx.body = rows[0];
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function deleteStudent(ctx) {
    const id = Number(ctx.params.id);

    if (!Number.isInteger(id) || id < 1) {
        ctx.throw(400, 'Некорректный ID');
    }

    const [result] = await pool.execute(
        'DELETE FROM students WHERE id = ?',
        [id]
    );

    if (result.affectedRows === 0) {
        ctx.throw(404, 'Студент не найден');
    }

    clearCache();
    ctx.body = {
        message: 'Студент удалён',
        id
    };
}

async function getMetrics(ctx) {
    ctx.body = {
        ...metrics,
        uptimeSeconds: Math.floor((Date.now() - metrics.startedAt) / 1000),
        cacheEntries: cache.size
    };
}

async function getHealth(ctx) {
    await pool.query('SELECT 1');
    ctx.body = {
        status: 'ok',
        database: 'connected'
    };
}

module.exports = {
    metrics,
    getStudents,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    getMetrics,
    getHealth
};