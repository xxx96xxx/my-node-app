import { UserService } from '../services/userService.js';
import { userSchema } from '../models/user.js';

function validateUser(data) {
    const { error, value } = userSchema.validate(data, {
        abortEarly: false,
        convert: true,
        stripUnknown: true
    });

    if (error) {
        const message = error.details
            .map((detail) => detail.message)
            .join('; ');

        const validationError = new Error(message);
        validationError.status = 400;
        throw validationError;
    }

    return value;
}

// GET /api/users
// Получение списка с пагинацией, фильтрами, поиском и сортировкой
export async function getUsers(ctx) {
    const result = await UserService.getAll(ctx.db, {
        page: ctx.query.page,
        limit: ctx.query.limit,
        group_name: ctx.query.group_name,
        course: ctx.query.course,
        search: ctx.query.search,
        sortBy: ctx.query.sortBy,
        order: ctx.query.order
    });

    ctx.status = 200;
    ctx.body = result;
}

// GET /api/users/:id
// Получение пользователя по ID
export async function getUser(ctx) {
    const user = await UserService.getById(ctx.db, ctx.params.id);

    ctx.status = 200;
    ctx.body = {
        data: user
    };
}

// POST /api/users
// Создание пользователя
export async function createUser(ctx) {
    const data = validateUser(ctx.request.body);
    const user = await UserService.create(ctx.db, data);

    ctx.status = 201;
    ctx.body = {
        message: 'Пользователь успешно создан',
        data: user
    };
}

// PUT /api/users/:id
// Полное обновление пользователя
export async function updateUser(ctx) {
    const data = validateUser(ctx.request.body);
    const user = await UserService.update(
        ctx.db,
        ctx.params.id,
        data
    );

    ctx.status = 200;
    ctx.body = {
        message: 'Пользователь успешно обновлён',
        data: user
    };
}

// DELETE /api/users/:id
// Удаление пользователя
export async function deleteUser(ctx) {
    const user = await UserService.delete(
        ctx.db,
        ctx.params.id
    );

    ctx.status = 200;
    ctx.body = {
        message: 'Пользователь успешно удалён',
        data: user
    };
}
// GET /api/users/stats
// Статистика по пользователям и группам
export async function getUserStats(ctx) {
    const stats = await UserService.getStats(ctx.db);

    ctx.status = 200;
    ctx.body = {
        data: stats
    };
}

// GET /api/users/export
// Экспорт пользователей в CSV
export async function exportUsers(ctx) {
    const csv = await UserService.exportCSV(ctx.db);

    ctx.status = 200;
    ctx.type = 'text/csv; charset=utf-8';
    ctx.set(
        'Content-Disposition',
        'attachment; filename="users.csv"'
    );
    ctx.body = '\uFEFF' + csv;
}