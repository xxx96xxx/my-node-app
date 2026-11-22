import { ObjectId } from 'mongodb';
import Joi from 'joi';

export const userSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/).required(),
    age: Joi.number().integer().min(16).max(100).required(),
    course: Joi.number().integer().min(1).max(4).optional()
});

export class User {
    static collection(db) {
        return db.collection('users');
    }

    // Получение всех пользователей
    static async findAll(db) {
        return this.collection(db).find({}).toArray();
    }

    // Получение пользователей с пагинацией, фильтрацией и сортировкой
    static async findPaginated(db, options = {}) {
        const {
            page = 1,
            limit = 10,
            group_name,
            course,
            search,
            sortBy = 'created_at',
            order = 'asc'
        } = options;

        const filter = {};

        if (group_name) {
            filter.group_name = group_name;
        }

        if (course !== undefined) {
            filter.course = Number(course);
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const allowedSortFields = [
            'name',
            'email',
            'age',
            'course',
            'created_at'
        ];

        const safeSortBy = allowedSortFields.includes(sortBy)
            ? sortBy
            : 'created_at';

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.collection(db)
                .find(filter)
                .sort({ [safeSortBy]: sortOrder })
                .skip(skip)
                .limit(limit)
                .toArray(),

            this.collection(db).countDocuments(filter)
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Статистика пользователей по группам
    static async getStats(db) {
        const result = await this.collection(db).aggregate([
            {
                $group: {
                    _id: '$group_name',
                    totalUsers: { $sum: 1 },
                    averageAge: { $avg: '$age' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]).toArray();

        const total = await this.collection(db).countDocuments();

        return {
            totalUsers: total,
            groups: result.map((item) => ({
                group_name: item._id,
                totalUsers: item.totalUsers,
                averageAge: Number(item.averageAge.toFixed(2))
            }))
        };
    }

    // Экспорт пользователей в CSV
    static async exportCSV(db) {
        const users = await this.collection(db)
            .find({})
            .sort({ name: 1 })
            .toArray();

        const columns = [
            'id',
            'name',
            'email',
            'group_name',
            'age',
            'course',
            'created_at'
        ];

        const escapeCSV = (value) => {
            if (value === null || value === undefined) {
                return '';
            }

            return `"${String(value).replace(/"/g, '""')}"`;
        };

        const rows = users.map((user) => [
            user._id,
            user.name,
            user.email,
            user.group_name,
            user.age,
            user.course,
            user.created_at?.toISOString()
        ]);

        return [
            columns.join(';'),
            ...rows.map((row) => row.map(escapeCSV).join(';'))
        ].join('\n');
    }

    // Получение пользователя по ID
    static async findById(db, id) {
        if (!ObjectId.isValid(id)) {
            return null;
        }

        return this.collection(db).findOne({
            _id: new ObjectId(id)
        });
    }

    // Поиск пользователя по email
    static async findByEmail(db, email) {
        return this.collection(db).findOne({
            email: email.trim().toLowerCase()
        });
    }

    // Создание пользователя
    static async create(db, data) {
        const user = {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            group_name: data.group_name,
            age: Number(data.age),
            ...(data.course !== undefined && {
                course: Number(data.course)
            }),
            created_at: new Date(),
            updated_at: new Date()
        };

        const result = await this.collection(db).insertOne(user);

        return {
            _id: result.insertedId,
            ...user
        };
    }

    // Обновление пользователя
    static async update(db, id, data) {
        if (!ObjectId.isValid(id)) {
            return null;
        }

        const updateData = {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            group_name: data.group_name,
            age: Number(data.age),
            updated_at: new Date()
        };

        if (data.course !== undefined) {
            updateData.course = Number(data.course);
        }

        return this.collection(db).findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );
    }

    // Удаление пользователя
    static async delete(db, id) {
        if (!ObjectId.isValid(id)) {
            return null;
        }

        return this.collection(db).findOneAndDelete({
            _id: new ObjectId(id)
        });
    }
}