
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = process.env.MONGODB_DB || 'bbmo_01_23';
const TEST_TAG = 'lab23_task2';

async function main() {
    try {
        await client.connect();

        const db = client.db(dbName);
        const students = db.collection('students');

const indexes = await students.listIndexes().toArray();

const groupIndexExists = indexes.some(index =>
    index.key &&
    index.key.group_name === 1 &&
    Object.keys(index.key).length === 1
);

if (!groupIndexExists) {
    await students.createIndex(
        { group_name: 1 },
        { name: 'idx_group_name' }
    );
    console.log('Индекс idx_group_name создан');
} else {
    console.log('Индекс по полю group_name уже существует');
}        console.log('Индекс group_name создан');

        // Удаляем только тестовые документы этого задания,
        // оставшиеся после предыдущего запуска.
        await students.deleteMany({ lab_tag: TEST_TAG });

        console.log('\n=== INSERT ===');

        // Вставка одного документа
        const oneResult = await students.insertOne({
            name: 'Максим',
            group_name: 'ББМО-01-23',
            course: 3,
            grade: 4.5,
            created_at: new Date(),
            lab_tag: TEST_TAG
        });

        console.log('insertOne insertedId:', oneResult.insertedId);

        // Вставка нескольких документов
        const manyResult = await students.insertMany([
            {
                name: 'Алексей',
                group_name: 'ББМО-01-23',
                course: 2,
                grade: 3.8,
                created_at: new Date(),
                lab_tag: TEST_TAG
            },
            {
                name: 'Дмитрий',
                group_name: 'ББМО-01-23',
                course: 3,
                grade: 4.2,
                created_at: new Date(),
                lab_tag: TEST_TAG
            },
            {
                name: 'Андрей',
                group_name: 'ББМО-01-23',
                course: 2,
                grade: 2.5,
                created_at: new Date(),
                lab_tag: TEST_TAG
            }
        ]);

        console.log('insertMany insertedCount:', manyResult.insertedCount);
        console.log('insertedIds:', manyResult.insertedIds);

        console.log('\n=== SELECT ===');

        // Поиск всех тестовых документов
        const allStudents = await students
            .find({ lab_tag: TEST_TAG })
            .toArray();

        console.log('Все тестовые документы:', allStudents.length);
        console.dir(allStudents, { depth: null });

        // Поиск с фильтром по группе
        const byGroup = await students.find({
            group_name: 'ББМО-01-23',
            lab_tag: TEST_TAG
        }).toArray();

        console.log('\nПоиск по группе:', byGroup.length);
        console.dir(byGroup, { depth: null });

        // Сортировка по оценке и пагинация
        const sortedStudents = await students
            .find({ lab_tag: TEST_TAG })
            .sort({ grade: -1 })
            .skip(0)
            .limit(2)
            .toArray();

        console.log('\nСортировка по оценке, первые 2 записи:');
        console.dir(sortedStudents, { depth: null });

        // Поиск одного документа по ObjectId
        const oneStudent = await students.findOne({
            _id: oneResult.insertedId
        });

        console.log('\nfindOne по _id:');
        console.dir(oneStudent, { depth: null });

        // Проекция: выводим только имя и оценку
        const projection = await students.find(
            { lab_tag: TEST_TAG },
            { projection: { name: 1, grade: 1, _id: 0 } }
        ).toArray();

        console.log('\nПроекция name и grade:');
        console.dir(projection, { depth: null });

        console.log('\n=== UPDATE ===');

        // Обновление одного документа
        const updateOneResult = await students.updateOne(
            { _id: oneResult.insertedId },
            { $set: { grade: 4.9 } }
        );

        console.log('updateOne matchedCount:', updateOneResult.matchedCount);
        console.log('updateOne modifiedCount:', updateOneResult.modifiedCount);

        // Обновление нескольких тестовых документов
        const updateManyResult = await students.updateMany(
            {
                group_name: 'ББМО-01-23',
                lab_tag: TEST_TAG
            },
            { $inc: { course: 1 } }
        );

        console.log('updateMany matchedCount:', updateManyResult.matchedCount);
        console.log('updateMany modifiedCount:', updateManyResult.modifiedCount);

        console.log('\nДокументы после обновления:');
        console.dir(
            await students.find({ lab_tag: TEST_TAG }).toArray(),
            { depth: null }
        );

        console.log('\n=== DELETE ===');

        // Удаление одного документа
        const deleteOneResult = await students.deleteOne({
            _id: oneResult.insertedId
        });

        console.log('deleteOne deletedCount:', deleteOneResult.deletedCount);

        // Удаление документов с оценкой ниже 3
        const deleteManyResult = await students.deleteMany({
            lab_tag: TEST_TAG,
            grade: { $lt: 3 }
        });

        console.log('deleteMany deletedCount:', deleteManyResult.deletedCount);

        // Удаляем остальные тестовые записи, чтобы не оставлять
        // данные лабораторной в рабочей коллекции.
        const cleanupResult = await students.deleteMany({
            lab_tag: TEST_TAG
        });

        console.log('Очистка тестовых записей:', cleanupResult.deletedCount);

        console.log('\nCRUD-операции успешно завершены.');
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await client.close();
        console.log('Соединение с MongoDB закрыто');
    }
}

main();
