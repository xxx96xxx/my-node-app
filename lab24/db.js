
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

const client = new MongoClient(uri);

let database;

export async function connectDB() {
    if (database) {
        return database;
    }

    await client.connect();
    database = client.db(dbName);

    console.log('[INFO] MongoDB подключена');
    console.log(`[INFO] База данных: ${dbName}`);

    return database;
}

export function getDB() {
    if (!database) {
        throw new Error('MongoDB ещё не подключена');
    }

    return database;
}

export async function closeDB() {
    await client.close();
    database = null;
    console.log('[INFO] Соединение с MongoDB закрыто');
}
