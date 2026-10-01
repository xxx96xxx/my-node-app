const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'bbmo_01_23';

const client = new MongoClient(uri);

let database;

async function connectDB() {
    if (!database) {
        await client.connect();
        database = client.db(dbName);
        console.log(`[INFO] MongoDB подключена: ${dbName}`);
    }

    return database;
}

function getDB() {
    if (!database) {
        throw new Error('MongoDB ещё не подключена');
    }

    return database;
}

async function closeDB() {
    await client.close();
    console.log('[INFO] MongoDB соединение закрыто');
}

module.exports = {
    connectDB,
    getDB,
    closeDB,
    client
};