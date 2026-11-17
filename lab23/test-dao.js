
require('dotenv').config({ path: 'lab23/.env' });

const { connectDB, closeDB } = require('./config/database');
const StudentDAO = require('./dao/StudentDAO');

async function main() {
    try {
        await connectDB();

        const dao = new StudentDAO();

        console.log('\n=== CREATE ===');
        const created = await dao.create({
            name: 'Максим DAO',
            group_name: 'ББМО-01-23',
            course: 3,
            grade: 4.8
        });
        console.log(created);

        console.log('\n=== FIND BY ID ===');
        console.log(await dao.findById(created._id.toString()));

        console.log('\n=== FIND ALL ===');
        console.log(await dao.findAll({
            page: 1,
            limit: 5,
            group_name: 'ББМО-01-23',
            sort: 'name',
            order: 'asc'
        }));

        console.log('\n=== UPDATE ===');
        console.log(await dao.update(created._id.toString(), {
            grade: 5
        }));

        console.log('\n=== SEARCH ===');
        console.log(await dao.search('Максим'));

        console.log('\n=== STATS ===');
        console.log(await dao.getStats());

        console.log('\n=== BATCH CREATE ===');
        console.log(await dao.batchCreate([
            {
                name: 'Максим Batch 1',
                group_name: 'ББМО-01-23',
                course: 2,
                grade: 4
            },
            {
                name: 'Максим Batch 2',
                group_name: 'ББМО-01-23',
                course: 2,
                grade: 5
            }
        ]));

        console.log('\n=== DELETE ===');
        console.log(await dao.delete(created._id.toString()));

        console.log('\n[OK] Проверка DAO завершена');
    } catch (error) {
        console.error('[ERROR]', error);
        process.exitCode = 1;
    } finally {
        await closeDB();
    }
}

main();
