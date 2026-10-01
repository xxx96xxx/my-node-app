
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'bbmo_01_23';

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 5000
});

client.on('serverHeartbeatSucceeded', event => {
    console.log(`[HEARTBEAT] Успешно: ${new Date().toISOString()}`);
});

client.on('serverHeartbeatFailed', event => {
    console.log(`[HEARTBEAT] Ошибка: ${event.failure?.message || 'Нет соединения'}`);
});

async function main() {
    try {
        console.log('=== Подключение к MongoDB ===');

        // Установка соединения через MongoClient
        await client.connect();
        console.log('Подключение установлено');

        // Получение объекта базы данных
        const db = client.db(dbName);

        // Проверка соединения
        await db.command({ ping: 1 });
        console.log('Проверка ping: успешно');
        console.log(`База данных: ${db.databaseName}`);

        console.log('\n=== Информация о сервере ===');

        const buildInfo = await db.admin().command({ buildInfo: 1 });
        console.log(`Версия MongoDB: ${buildInfo.version}`);

        const databaseList = await db.admin().listDatabases();
        console.log('Список баз данных:');

        for (const database of databaseList.databases) {
            console.log(`- ${database.name}`);
        }

        console.log(`\nКоллекции в ${dbName}:`);
        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            console.log('(пока нет коллекций)');
        } else {
            for (const collection of collections) {
                console.log(`- ${collection.name}`);
            }
        }

        console.log('\n=== Heartbeat ===');

        // Несколько проверок доступности
        for (let i = 1; i <= 3; i++) {
            await db.command({ ping: 1 });
            console.log(`Проверка ${i}: соединение доступно`);
            if (i < 3) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        console.log('\nСоединение стабильно');
    } catch (error) {
        console.error('Ошибка подключения:', error.message);
    } finally {
        await client.close();
        console.log('Соединение закрыто');
    }
}

main();
