
const { ObjectId } = require('mongodb');
const { getDB, client } = require('../config/database');
const { validateStudent } = require('../models/student');

class StudentDAO {
    constructor() {
        this.collectionName = 'students';
    }

    get collection() {
        return getDB().collection(this.collectionName);
    }

    // Создание студента с валидацией
    async create(data) {
        const errors = validateStudent(data);

        if (errors.length > 0) {
            const error = new Error(errors.join('; '));
            error.status = 400;
            throw error;
        }

        const student = {
            name: data.name.trim(),
            group_name: data.group_name.trim(),
            course: data.course,
            ...(data.grade !== undefined && { grade: data.grade }),
            ...(data.email !== undefined && { email: data.email }),
            created_at: new Date()
        };

        const result = await this.collection.insertOne(student);
        return this.findById(result.insertedId.toString());
    }

    // Получение студента по ID
    async findById(id) {
        if (!ObjectId.isValid(id)) {
            return null;
        }

        return this.collection.findOne({
            _id: new ObjectId(id)
        });
    }

    // Получение списка с пагинацией, фильтрами и сортировкой
    async findAll(options = {}) {
        const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(options.limit, 10) || 10)
        );
        const skip = (page - 1) * limit;

        const filter = {};

        if (options.group_name) {
            filter.group_name = options.group_name;
        }

        if (options.course !== undefined && options.course !== '') {
            const course = Number(options.course);
            if (!Number.isInteger(course) || course < 1 || course > 4) {
                const error = new Error('Некорректный курс');
                error.status = 400;
                throw error;
            }
            filter.course = course;
        }

        const allowedSortFields = ['name', 'course', 'grade', 'created_at'];
        const sortField = allowedSortFields.includes(options.sort)
            ? options.sort
            : 'name';

        const sortOrder = options.order === 'desc' ? -1 : 1;

        const [data, total] = await Promise.all([
            this.collection
                .find(filter)
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .toArray(),
            this.collection.countDocuments(filter)
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Обновление данных студента
    async update(id, data) {
        if (!ObjectId.isValid(id)) {
            return null;
        }

        const allowedFields = ['name', 'group_name', 'course', 'grade', 'email'];
        const updateData = {};

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            const error = new Error('Нет полей для обновления');
            error.status = 400;
            throw error;
        }

        const current = await this.findById(id);
        if (!current) {
            return null;
        }

        const candidate = { ...current, ...updateData };
        const errors = validateStudent(candidate);

        if (errors.length > 0) {
            const error = new Error(errors.join('; '));
            error.status = 400;
            throw error;
        }

        if (updateData.name !== undefined) {
            updateData.name = updateData.name.trim();
        }

        if (updateData.group_name !== undefined) {
            updateData.group_name = updateData.group_name.trim();
        }

        await this.collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return this.findById(id);
    }

    // Удаление студента
    async delete(id) {
        if (!ObjectId.isValid(id)) {
            return false;
        }

        const result = await this.collection.deleteOne({
            _id: new ObjectId(id)
        });

        return result.deletedCount === 1;
    }

    // Текстовый поиск
    async search(query, limit = 20) {
        const text = String(query || '').trim();

        if (!text) {
            const error = new Error('Укажите поисковый запрос');
            error.status = 400;
            throw error;
        }

        const safeLimit = Math.min(
            100,
            Math.max(1, Number.parseInt(limit, 10) || 20)
        );

        return this.collection
            .find({ $text: { $search: text } })
            .project({
                name: 1,
                group_name: 1,
                course: 1,
                grade: 1,
                score: { $meta: 'textScore' }
            })
            .sort({ score: { $meta: 'textScore' } })
            .limit(safeLimit)
            .toArray();
    }

    // Статистика по студентам
    async getStats() {
        const [total, aggregation] = await Promise.all([
            this.collection.countDocuments(),
            this.collection.aggregate([
                {
                    $group: {
                        _id: '$group_name',
                        count: { $sum: 1 },
                        averageGrade: { $avg: '$grade' }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]).toArray()
        ]);

        const byGroup = aggregation.map(item => ({
            group_name: item._id,
            count: item.count,
            averageGrade: item.averageGrade === null
                ? null
                : Number(item.averageGrade.toFixed(2))
        }));

        const [gradeResult] = await this.collection.aggregate([
            {
                $group: {
                    _id: null,
                    averageGrade: { $avg: '$grade' }
                }
            }
        ]).toArray();

        return {
            total,
            averageGrade: gradeResult?.averageGrade == null
                ? null
                : Number(gradeResult.averageGrade.toFixed(2)),
            byGroup
        };
    }

    // Массовое добавление в транзакции
    async batchCreate(array) {
        if (!Array.isArray(array) || array.length === 0) {
            const error = new Error('Передайте непустой массив студентов');
            error.status = 400;
            throw error;
        }

        if (array.length > 500) {
            const error = new Error('За один запрос можно добавить не более 500 студентов');
            error.status = 400;
            throw error;
        }

        const documents = array.map((data, index) => {
            const errors = validateStudent(data);

            if (errors.length > 0) {
                const error = new Error(
                    `Студент №${index + 1}: ${errors.join('; ')}`
                );
                error.status = 400;
                throw error;
            }

            return {
                name: data.name.trim(),
                group_name: data.group_name.trim(),
                course: data.course,
                ...(data.grade !== undefined && { grade: data.grade }),
                ...(data.email !== undefined && { email: data.email }),
                created_at: new Date()
            };
        });

        const session = client.startSession();

        try {
            let insertedIds = [];

            await session.withTransaction(async () => {
                const result = await this.collection.insertMany(
                    documents,
                    { session, ordered: true }
                );

                insertedIds = Object.values(result.insertedIds);
            });

            return {
                inserted: insertedIds.length,
                transaction: 'committed',
                ids: insertedIds
            };
        } finally {
            await session.endSession();
        }
    }
}

module.exports = StudentDAO;
