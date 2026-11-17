const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'lab23/.env' });

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'bbmo_01_23';

const TEST_TAG = 'lab23_task3';
const TOTAL_DOCUMENTS = 1_000_000;
const BATCH_SIZE = 1000;

async function main() {
    const client = new MongoClient(URI);

    try {
        await client.connect();

        const db = client.db(DB_NAME);
        const students = db.collection('students');
        const largeStudents = db.collection('lab23_large_students');
        const groups = db.collection('groups');

        console.log('=== MongoDB: задание 3 ===');
        console.log(`База данных: ${DB_NAME}`);

        // 1. КУРСОРЫ
        console.log('\n=== 1. КУРСОРЫ ===');

        const cursor = students.find(
            { group_name: 'ББМО-01-23' },
            { projection: { name: 1, group_name: 1, grade: 1 } }
        ).batchSize(100);

        let cursorCount = 0;

        console.log('Итерация через for await:');

        for await (const doc of cursor) {
            if (cursorCount < 5) {
                console.log(doc);
            }
            cursorCount++;
        }

        console.log(`Всего обработано курсором: ${cursorCount}`);

        // Получение одного документа через next()
        const nextCursor = students.find({}).batchSize(10);
        const firstDocument = await nextCursor.next();

        console.log('\nПервый документ через next():');
        console.log(firstDocument);

        await nextCursor.close();

        // Безопасная демонстрация toArray() на ограниченной выборке
        const memoryBefore = process.memoryUsage().heapUsed;
        const sample = await students.find({}).limit(1000).toArray();
        const memoryAfter = process.memoryUsage().heapUsed;

        console.log('\ntoArray() на выборке из 1000 документов:');
        console.log(`Получено документов: ${sample.length}`);
        console.log(
            `Изменение heap: ${((memoryAfter - memoryBefore) / 1024 / 1024).toFixed(2)} МБ`
        );

        // 2. АГРЕГАЦИИ
        console.log('\n=== 2. АГРЕГАЦИИ ===');

        console.log('\nСредний балл по группам:');

        const averageByGroup = await students.aggregate([
            {
                $group: {
                    _id: '$group_name',
                    averageGrade: { $avg: '$grade' },
                    studentsCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    group_name: '$_id',
                    averageGrade: { $round: ['$averageGrade', 2] },
                    studentsCount: 1
                }
            }
        ]).toArray();

        console.log(averageByGroup);

        console.log('\nКоличество студентов по курсам:');

        const countByCourse = await students.aggregate([
            {
                $group: {
                    _id: '$course',
                    studentsCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    course: '$_id',
                    studentsCount: 1
                }
            }
        ]).toArray();

        console.log(countByCourse);

        console.log('\nТоп-10 студентов по оценке:');

        const topStudents = await students.aggregate([
            { $match: { grade: { $type: 'number' } } },
            { $sort: { grade: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    group_name: 1,
                    grade: 1
                }
            }
        ]).toArray();

        console.log(topStudents);

        // Данные групп для демонстрации $lookup
        await groups.updateOne(
            { group_name: 'ББМО-01-23' },
            {
                $set: {
                    group_name: 'ББМО-01-23',
                    curator: 'Иванов И.И.'
                }
            },
            { upsert: true }
        );

        await groups.updateOne(
            { group_name: 'ББМО-02-23' },
            {
                $set: {
                    group_name: 'ББМО-02-23',
                    curator: 'Петров П.П.'
                }
            },
            { upsert: true }
        );

        await groups.updateOne(
            { group_name: 'ББМО-03-23' },
            {
                $set: {
                    group_name: 'ББМО-03-23',
                    curator: 'Сидоров С.С.'
                }
            },
            { upsert: true }
        );

        console.log('\nJOIN через $lookup:');

        const lookupResult = await students.aggregate([
            {
                $lookup: {
                    from: 'groups',
                    localField: 'group_name',
                    foreignField: 'group_name',
                    as: 'group_info'
                }
            },
            { $unwind: { path: '$group_info', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    group_name: 1,
                    grade: 1,
                    curator: '$group_info.curator'
                }
            },
            { $limit: 10 }
        ]).toArray();

        console.log(lookupResult);

        // 3. ПОТОКОВАЯ ОБРАБОТКА 1 000 000 ДОКУМЕНТОВ
        console.log('\n=== 3. ПОТОКОВАЯ ОБРАБОТКА ===');
        console.log(`Подготовка ${TOTAL_DOCUMENTS} тестовых документов...`);

        // Удаляем только записи, созданные этим заданием
        await largeStudents.deleteMany({ test_tag: TEST_TAG });

        const insertStart = Date.now();

        for (let offset = 0; offset < TOTAL_DOCUMENTS; offset += BATCH_SIZE) {
            const batch = [];

            for (
                let i = offset;
                i < Math.min(offset + BATCH_SIZE, TOTAL_DOCUMENTS);
                i++
            ) {
                batch.push({
                    name: `Студент ${i + 1}`,
                    group_name: `ББМО-0${(i % 3) + 1}-23`,
                    course: (i % 4) + 1,
                    grade: Number((2 + (i % 31) / 10).toFixed(1)),
                    email: `student${i + 1}_lab23@example.com`,
                    created_at: new Date(),
                    test_tag: TEST_TAG
                });
            }

            await largeStudents.insertMany(batch, { ordered: false });

            const inserted = Math.min(offset + BATCH_SIZE, TOTAL_DOCUMENTS);
            if (inserted % 100000 === 0 || inserted === TOTAL_DOCUMENTS) {
                console.log(`Добавлено: ${inserted} / ${TOTAL_DOCUMENTS}`);
            }
        }

        console.log(
            `Вставка завершена за ${((Date.now() - insertStart) / 1000).toFixed(2)} сек.`
        );

        console.log('\nЧтение документов через курсор:');

        const streamStart = Date.now();
        const memoryStreamBefore = process.memoryUsage().heapUsed;
        let processed = 0;
        let gradeSum = 0;

        const largeCursor = largeStudents.find(
            { test_tag: TEST_TAG },
            { projection: { grade: 1 } }
        ).batchSize(BATCH_SIZE);

        for await (const doc of largeCursor) {
            gradeSum += doc.grade;
            processed++;

            if (processed % 100000 === 0) {
                console.log(`Обработано: ${processed}`);
            }
        }

        await largeCursor.close();

        const streamSeconds = (Date.now() - streamStart) / 1000;
        const memoryStreamAfter = process.memoryUsage().heapUsed;

        console.log(`Всего обработано: ${processed}`);
        console.log(`Средний балл: ${(gradeSum / processed).toFixed(2)}`);
        console.log(`Время обработки: ${streamSeconds.toFixed(2)} сек.`);
        console.log(
            `Изменение heap: ${((memoryStreamAfter - memoryStreamBefore) / 1024 / 1024).toFixed(2)} МБ`
        );
        console.log(
            `Скорость: ${(processed / Math.max(streamSeconds, 0.001)).toFixed(0)} документов/сек.`
        );

        // 4. ИНДЕКСЫ
        console.log('\n=== 4. ИНДЕКСЫ ===');

        const ensureIndex = async (collection, key, options = {}) => {
            const existing = await collection.listIndexes().toArray();

            const found = existing.some(index => {
                const oldKeys = Object.entries(index.key || {});
                const newKeys = Object.entries(key);

                return oldKeys.length === newKeys.length &&
                    newKeys.every(([field, direction], i) =>
                        oldKeys[i][0] === field && oldKeys[i][1] === direction
                    );
            });

            if (found) {
                console.log(`Индекс уже существует: ${JSON.stringify(key)}`);
            } else {
                const name = await collection.createIndex(key, options);
                console.log(`Создан индекс: ${name}`);
            }
        };

        await ensureIndex(students, { group_name: 1 });
        await ensureIndex(students, { group_name: 1, grade: -1 });

        // Уникальный индекс на отдельной коллекции, чтобы не затрагивать
        // существующие документы students и их email
        const indexDemo = db.collection('lab23_index_demo');

        await indexDemo.createIndex(
            { email: 1 },
            { unique: true, name: 'email_unique_lab23' }
        ).catch(error => {
            if (error.codeName !== 'IndexOptionsConflict' &&
                error.codeName !== 'IndexKeySpecsConflict') {
                throw error;
            }
            console.log('Уникальный индекс email уже существует с другими параметрами');
        });

        console.log('\nПроверка запроса без использования индекса:');

        const explainWithoutIndex = await students.find(
            { group_name: 'ББМО-01-23' }
        ).hint({ $natural: 1 }).explain('executionStats');

        console.log({
            executionTimeMillis: explainWithoutIndex.executionStats.executionTimeMillis,
            totalDocsExamined: explainWithoutIndex.executionStats.totalDocsExamined
        });

        console.log('\nПроверка запроса с индексом:');

        const explainWithIndex = await students.find(
            { group_name: 'ББМО-01-23' }
        ).hint({ group_name: 1 }).explain('executionStats');

        console.log({
            executionTimeMillis: explainWithIndex.executionStats.executionTimeMillis,
            totalDocsExamined: explainWithIndex.executionStats.totalDocsExamined
        });

        // 5. ТЕКСТОВЫЙ ПОИСК
        console.log('\n=== 5. ТЕКСТОВЫЙ ПОИСК ===');

        await ensureIndex(students, { name: 'text' });

        const textResults = await students.find(
            { $text: { $search: 'Максим' } },
            {
                projection: {
                    name: 1,
                    group_name: 1,
                    grade: 1,
                    score: { $meta: 'textScore' }
                }
            }
        ).sort({ score: { $meta: 'textScore' } }).limit(10).toArray();

        console.log('Результаты поиска по слову «Максим»:');
        console.log(textResults);
        console.log(`Найдено документов: ${textResults.length}`);

        console.log('\n=== ЗАДАНИЕ 3 ЗАВЕРШЕНО ===');

    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await client.close();
        console.log('\nСоединение с MongoDB закрыто');
    }
}

main();