
import { connectDB, closeDB } from './db.js';

try {
    const db = await connectDB();
    const collections = await db.listCollections().toArray();

    console.log('[INFO] Подключение успешно');
    console.log('Коллекции:', collections.map(item => item.name));
} catch (error) {
    console.error('[ERROR]', error.message);
} finally {
    await closeDB();
}
