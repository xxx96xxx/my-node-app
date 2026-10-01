import { User } from '../models/user.js';

export class UserService {
    // Получение списка с пагинацией, фильтрами и сортировкой
    static async getAll(db, options = {}) {
        const page = Number(options.page ?? 1);
        const limit = Number(options.limit ?? 10);

        if (
            !Number.isInteger(page) ||
            !Number.isInteger(limit) ||
            page < 1 ||
            limit < 1 ||
            limit > 100
        ) {
            const error = new Error(
                'Параметры page и limit должны быть положительными целыми числами, limit не более 100'
            );
            error.status = 400;
            throw error;
        }

        if (
            options.course !== undefined &&
            (!Number.isInteger(Number(options.course)) ||
                Number(options.course) < 1 ||
                Number(options.course) > 4)
        ) {
            const error = new Error('Курс должен быть целым числом от 1 до 4');
            error.status = 400;
            throw error;
        }

        return User.findPaginated(db, {
            page,
            limit,
            group_name: options.group_name,
            course: options.course,
            search: options.search,
            sortBy: options.sortBy,
            order: options.order
        });
    }

    // Получение пользователя по ID
    static async getById(db, id) {
        const user = await User.findById(db, id);

        if (!user) {
            const error = new Error('Пользователь не найден');
            error.status = 404;
            throw error;
        }

        return user;
    }

    // Создание пользователя
    static async create(db, data) {
        const existing = await User.findByEmail(db, data.email);

        if (existing) {
            const error = new Error(
                'Пользователь с таким email уже существует'
            );
            error.status = 409;
            throw error;
        }

        const user = await User.create(db, data);

        console.log(
            `[INFO] Уведомление о регистрации отправлено: ${user.email}`
        );

        return user;
    }

    // Обновление пользователя
    static async update(db, id, data) {
        const existingUser = await User.findById(db, id);

        if (!existingUser) {
            const error = new Error('Пользователь не найден');
            error.status = 404;
            throw error;
        }

        const existingEmail = await User.findByEmail(db, data.email);

        if (
            existingEmail &&
            existingEmail._id.toString() !== id
        ) {
            const error = new Error(
                'Пользователь с таким email уже существует'
            );
            error.status = 409;
            throw error;
        }

        return User.update(db, id, data);
    }

    // Удаление пользователя
    static async delete(db, id) {
        const user = await User.delete(db, id);

        if (!user) {
            const error = new Error('Пользователь не найден');
            error.status = 404;
            throw error;
        }

        return user;
    }

    // Получение статистики
    static async getStats(db) {
        return User.getStats(db);
    }

    // Экспорт пользователей в CSV
    static async exportCSV(db) {
        return User.exportCSV(db);
    }
}