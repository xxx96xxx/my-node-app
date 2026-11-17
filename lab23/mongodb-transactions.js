
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'lab23/.env' });

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = process.env.MONGODB_DB || 'bbmo_01_23';

async function main() {
    let session;

    try {
        await client.connect();
        console.log('[INFO] MongoDB подключена');

        const db = client.db(dbName);
        const students = db.collection('students');

        // 1. Успешная транзакция
        session = client.startSession();

        try {
            await session.withTransaction(async () => {
                await students.insertMany(
                    [
                        {
                            name: 'Максим Транзакция',
                            group_name: 'ББМО-01-23',
                            course: 3,
                            grade: 5
                        },
                        {
                            name: 'Алексей Транзакция',
                            group_name: 'ББМО-01-23',
                            course: 3,
                            grade: 4
                        }
                    ],
                    { session }
                );

                await students.updateOne(
                    { name: 'Максим Транзакция' },
                    { $set: { grade: 5.0 } },
                    { session }
                );
            });

            console.log('[OK] Транзакция успешно выполнена');
        } finally {
            await session.endSession();
            session = null;
        }

        // 2. Транзакция с ошибкой и откатом
        const rollbackId = 'rollback_test_23';
        session = client.startSession();

        try {
            await session.withTransaction(async () => {
                await students.insertOne(
                    {
                        _id: rollbackId,
                        name: 'Тест отката',
                        group_name: 'ББМО-01-23',
                        course: 3
                    },
                    { session }
                );

                // Повторный _id вызовет ошибку дублирования
                await students.insertOne(
                    {
                        _id: rollbackId,
                        name: 'Повторная запись',
                        group_name: 'ББМО-01-23',
                        course: 3
                    },
                    { session }
                );
            });
        } catch (error) {
            console.log('[OK] Ошибка транзакции перехвачена:', error.code || error.message);
        } finally {
            await session.endSession();
            session = null;
        }

        const rollbackCount = await students.countDocuments({ _id: rollbackId });
        console.log('[INFO] Записей после отката:', rollbackCount);

        // 3. Change Streams
// 3. Change Streams
// 3. Change Streams
const changeStream = students.watch([], {
    maxAwaitTimeMS: 1000
});

console.log('[INFO] Change Streams запущен на 10 секунд');

// Добавляем запись, чтобы гарантированно получить событие
await students.insertOne({
    name: 'Максим Change Stream',
    group_name: 'ББМО-01-23',
    course: 3,
    grade: 5
});

// Получаем события, не используя for await
const endTime = Date.now() + 10000;

while (Date.now() < endTime) {
    const change = await changeStream.tryNext();

    if (change) {
        console.log('[CHANGE]', change.operationType);

        if (change.fullDocument) {
            console.log('[DOCUMENT]', change.fullDocument);
        }
    }
}

await changeStream.close();

console.log('[OK] Change Streams завершён');
await students.insertOne({
    name: 'Максим Change Stream',
    group_name: 'ББМО-01-23',
    course: 3,
    grade: 5
});

await new Promise(resolve => setTimeout(resolve, 10000));

await changeStream.close();

console.log('[OK] Change Streams завершён');        console.log('[INFO] Change Streams запущен на 10 секунд');

        const streamTask = (async () => {
            for await (const change of changeStream) {
                console.log('[CHANGE]', change.operationType);
                if (change.fullDocument) {
                    console.log('[DOCUMENT]', change.fullDocument);
                }
            }
        })();

        await students.insertOne({
            name: 'Максим Change Stream',
            group_name: 'ББМО-01-23',
            course: 3,
            grade: 5
        });

        await new Promise(resolve => setTimeout(resolve, 10000));

        await changeStream.close();
        await streamTask;

        console.log('[OK] Change Streams завершён');

        // 4. Проверка доступности PRIMARY
        const result = await db.command({ ping: 1 });
        console.log('[INFO] Проверка MongoDB:', result.ok === 1 ? 'успешна' : 'неуспешна');

    } catch (error) {
        console.error('[ERROR]', error);
        process.exitCode = 1;
    } finally {
        if (session) {
            await session.endSession();
        }
        await client.close();
        console.log('[INFO] Соединение закрыто');
    }
}

main();