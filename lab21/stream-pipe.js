
const fs = require('node:fs');
const path = require('node:path');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const DATA_DIR = __dirname;

const inputPath = path.join(DATA_DIR, 'input.txt');
const missingPath = path.join(DATA_DIR, 'missing.txt');

const pipeOutputPath = path.join(DATA_DIR, 'output-pipe.txt');
const pipelineOutputPath = path.join(DATA_DIR, 'output-pipeline.txt');
const chainOutputPath = path.join(DATA_DIR, 'output-chain.txt');

// Создаём исходный файл, если его ещё нет
if (!fs.existsSync(inputPath)) {
    fs.writeFileSync(
        inputPath,
        'Лабораторная работа №21\nСтудент: Максим\nТема: Потоки в Node.js\n',
        'utf8'
    );
}

function waitForFinish(stream) {
    return new Promise((resolve, reject) => {
        stream.once('finish', resolve);
        stream.once('error', reject);
    });
}

async function demonstratePipe() {
    console.log('\n=== Демонстрация pipe() ===');
    console.log('Чтение: input.txt');
    console.log('Запись: output-pipe.txt');

    const source = fs.createReadStream(inputPath);
    const destination = fs.createWriteStream(pipeOutputPath);

    const finished = waitForFinish(destination);

    source.pipe(destination);

    await finished;

    const stats = fs.statSync(pipeOutputPath);

    console.log('✔ Копирование завершено');
    console.log(`Размер: ${stats.size} байт`);
}

async function demonstratePipeError() {
    console.log('\n=== Демонстрация pipe() с ошибкой ===');
    console.log('Чтение: missing.txt');

    const source = fs.createReadStream(missingPath);
    const destination = fs.createWriteStream(
        path.join(DATA_DIR, 'output-pipe-error.txt')
    );

    source.pipe(destination);

    await new Promise((resolve) => {
        source.once('error', (error) => {
            console.log(`✖ Ошибка: ${error.message}`);

            console.log(
                `Writable destroyed: ${destination.destroyed}`
            );

            console.log(
                `Writable writableEnded: ${destination.writableEnded}`
            );

            if (!destination.destroyed) {
                console.log('⚠ pipe() не закрыл целевой поток автоматически');
                console.log('Закрываем целевой поток вручную');
                destination.destroy();
            }

            resolve();
        });
    });

    console.log('✔ Ресурсы целевого потока очищены вручную');
}

async function demonstratePipeline() {
    console.log('\n=== Демонстрация pipeline() ===');
    console.log('Чтение: input.txt');
    console.log('Запись: output-pipeline.txt');

    await pipeline(
        fs.createReadStream(inputPath),
        fs.createWriteStream(pipelineOutputPath)
    );

    console.log('✔ Копирование завершено');
}

async function demonstratePipelineError() {
    console.log('\n=== Демонстрация pipeline() с ошибкой ===');
    console.log('Чтение: missing.txt');

    const source = fs.createReadStream(missingPath);
    const destination = fs.createWriteStream(
        path.join(DATA_DIR, 'output-pipeline-error.txt')
    );

    try {
        await pipeline(source, destination);
    } catch (error) {
        console.log(`✖ Ошибка: ${error.message}`);
        console.log(`Readable destroyed: ${source.destroyed}`);
        console.log(`Writable destroyed: ${destination.destroyed}`);
        console.log('✔ pipeline() автоматически закрыл потоки');
    }
}

async function demonstrateChain() {
    console.log('\n=== Цепочка потоков ===');
    console.log('input.txt → uppercase → reverse → output-chain.txt');

    // Первый Transform переводит текст в верхний регистр
    const uppercase = new Transform({
        transform(chunk, encoding, callback) {
            callback(null, chunk.toString('utf8').toUpperCase());
        }
    });

    // Второй Transform собирает данные и разворачивает весь текст
    const reverse = new Transform({
        transform(chunk, encoding, callback) {
            this.data = (this.data || '') + chunk.toString('utf8');
            callback();
        },

        flush(callback) {
            const reversed = [...(this.data || '')].reverse().join('');
            callback(null, reversed);
        }
    });

    await pipeline(
        fs.createReadStream(inputPath),
        uppercase,
        reverse,
        fs.createWriteStream(chainOutputPath)
    );

    console.log('✔ Обработка завершена');
}

async function main() {
    try {
        await demonstratePipe();
        await demonstratePipeError();
        await demonstratePipeline();
        await demonstratePipelineError();
        await demonstrateChain();

        console.log('\n=== Сравнение файлов ===');

        const original = fs.readFileSync(inputPath);
        const copiedByPipe = fs.readFileSync(pipeOutputPath);
        const copiedByPipeline = fs.readFileSync(pipelineOutputPath);

        console.log(
            `pipe(): ${original.equals(copiedByPipe) ? 'файлы совпадают' : 'файлы различаются'}`
        );

        console.log(
            `pipeline(): ${original.equals(copiedByPipeline) ? 'файлы совпадают' : 'файлы различаются'}`
        );

        console.log('\nВсе демонстрации завершены');
    } catch (error) {
        console.error('Ошибка выполнения:', error.message);
        process.exitCode = 1;
    }
}

main();
