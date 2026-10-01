const fs = require('node:fs');
const path = require('node:path');
const { Readable, Transform, Writable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const GROUP = 'ББМО-01-23';
const TOTAL = 10000;
const BATCH_SIZE = 100;
const OUTPUT_FILE = path.join(__dirname, 'students.csv');
const ERROR_FILE = path.join(__dirname, 'errors.log');

const stats = {
    generated: 0,
    validated: 0,
    enriched: 0,
    filtered: 0,
    written: 0,
    errors: 0
};

const startedAt = Date.now();
const loggedErrors = new WeakSet();

function logError(streamName, error) {
    const message = `[${new Date().toLocaleString('ru-RU')}] [${GROUP}] [${streamName}] ${error.message}\n`;
    fs.appendFileSync(ERROR_FILE, message, 'utf8');
}

// Детерминированный генератор случайных чисел
function createRandom(seed = 12) {
    let value = seed;
    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

const random = createRandom(12);

// 1. Readable: генерирует студентов порциями по 100 объектов
class StudentSource extends Readable {
    constructor() {
        super({ objectMode: true, highWaterMark: 100 });
        this.nextId = 1;
    }

    _read() {
        setImmediate(() => {
            let count = 0;

            while (count < BATCH_SIZE && this.nextId <= TOTAL) {
                const id = this.nextId++;
                const student = {
                    id,
                    name: `Студент ${id}`,
                    group: GROUP,
                    course: Math.floor(random() * 4) + 1,
                    grade: Number((2 + random() * 3).toFixed(1))
                };

                // Намеренно создаём 13 ошибочных записей для проверки валидации
                if (id === 123 || id === 456) {
                    student.name = '';
                }
                if (id === 789) {
                    student.grade = 7;
                }

                this.generatedCount = (this.generatedCount || 0) + 1;
                stats.generated++;
                this.push(student);
                count++;
            }

            if (this.nextId > TOTAL) {
                this.push(null);
            }
        });
    }
}

// 2. ValidateTransform: проверяет поля объекта
class ValidateTransform extends Transform {
    constructor() {
        super({ objectMode: true, highWaterMark: 16 });
    }

    _transform(student, encoding, callback) {
        const valid =
            Number.isInteger(student.id) &&
            typeof student.name === 'string' &&
            student.name.trim().length > 0 &&
            typeof student.group === 'string' &&
            Number.isInteger(student.course) &&
            student.course >= 1 &&
            student.course <= 4 &&
            Number.isFinite(student.grade) &&
            student.grade >= 0 &&
            student.grade <= 5;

        if (!valid) {
            stats.errors++;
            logError('ValidateTransform', new Error(
                `Ошибка валидации: id=${student.id}, некорректные данные`
            ));
            return callback();
        }

        stats.validated++;
        callback(null, student);
    }
}

// 3. EnrichTransform: добавляет вычисляемое поле
class EnrichTransform extends Transform {
    constructor() {
        super({ objectMode: true, highWaterMark: 16 });
    }

    _transform(student, encoding, callback) {
        const averageGrade = Number(
            ((student.grade + (student.course + 2)) / 2).toFixed(1)
        );

        stats.enriched++;
        callback(null, { ...student, averageGrade });
    }
}

// 4. FilterTransform: оставляет студентов с оценкой выше 3
class FilterTransform extends Transform {
    constructor() {
        super({ objectMode: true, highWaterMark: 16 });
    }

    _transform(student, encoding, callback) {
        if (student.grade > 3) {
            callback(null, student);
        } else {
            stats.filtered++;
            callback();
        }
    }
}

// Экранирование значений CSV
function csvEscape(value) {
    const text = String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

// 5. FormatTransform: преобразует объект в CSV-строку
class FormatTransform extends Transform {
    constructor() {
        super({ writableObjectMode: true, readableHighWaterMark: 16 });
    }

    _transform(student, encoding, callback) {
        const row = [
            student.id,
            csvEscape(student.name),
            csvEscape(student.group),
            student.course,
            student.grade,
            student.averageGrade
        ].join(',') + '\n';

        callback(null, row);
    }
}

// 6. Writable: записывает CSV и учитывает backpressure
class CsvWriter extends Writable {
    constructor(fileStream) {
        super({ highWaterMark: 16 });
        this.fileStream = fileStream;
    }

    _write(chunk, encoding, callback) {
        const canContinue = this.fileStream.write(chunk);

        stats.written++;

        if (!canContinue) {
            console.log('[BACKPRESSURE] Запись приостановлена: буфер заполнен');
            this.fileStream.once('drain', () => {
                console.log('[DRAIN] Буфер освободился, продолжаем запись');
                callback();
            });
        } else {
            callback();
        }
    }

    _final(callback) {
        this.fileStream.end(callback);
    }

    _destroy(error, callback) {
        if (error && !this.fileStream.destroyed) {
            this.fileStream.destroy();
        }
        callback(error);
    }
}

// Отображение прогресса
function showProgress() {
    const percent = Math.floor((stats.generated / TOTAL) * 100);
    const filled = Math.floor(percent / 5);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);

    const seconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
    const speed = Math.floor(stats.generated / seconds);

    process.stdout.write(
        `\r[PROGRESS] ${bar} ${percent}% | ` +
        `${stats.generated}/${TOTAL} | ${speed} объектов/сек`
    );

    if (stats.generated === TOTAL) {
        process.stdout.write('\n');
    }
}

// 7. Основной конвейер
async function runPipeline() {
    console.log(`=== Конвейер обработки данных (группа ${GROUP}) ===`);
    console.log(`Источник: ${TOTAL} студентов`);
    console.log('Фильтр: оценка > 3');

    fs.writeFileSync(
        OUTPUT_FILE,
        'id,name,group,course,grade,averageGrade\n',
        'utf8'
    );
    fs.writeFileSync(ERROR_FILE, '', 'utf8');

    const source = new StudentSource();
    const validate = new ValidateTransform();
    const enrich = new EnrichTransform();
    const filter = new FilterTransform();
    const format = new FormatTransform();
    const fileStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });
    const writer = new CsvWriter(fileStream);

    const streams = [
        source, validate, enrich, filter, format, writer, fileStream
    ];

    for (const stream of streams) {
        stream.on('error', error => {
            if (!loggedErrors.has(error)) {
                loggedErrors.add(error);
                logError(stream.constructor.name, error);
            }
        });
    }

    let lastProgress = 0;
    const progressTimer = setInterval(() => {
        const current = Math.floor((stats.generated / TOTAL) * 100);
        if (current >= lastProgress + 20 || current === 100) {
            lastProgress = current;
            showProgress();
        }
    }, 200);

    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort(new Error('Превышено время обработки — 10 секунд'));
    }, 10000);

    try {
        await pipeline(
            source,
            validate,
            enrich,
            filter,
            format,
            writer,
            { signal: controller.signal }
        );
        console.log('Конвейер успешно завершён.');
    } catch (error) {
        console.log(`[PIPELINE ERROR] ${error.message}`);
        logError('pipeline', error);
    } finally {
        clearTimeout(timeout);
        clearInterval(progressTimer);
    }

    const elapsed = (Date.now() - startedAt) / 1000;
    const speed = Math.round(stats.generated / Math.max(elapsed, 0.001));

    console.log('\n=== Результаты ===');
    console.log(`Всего сгенерировано: ${stats.generated}`);
    console.log(`Прошло валидацию: ${stats.validated}`);
    console.log(`Обогащено: ${stats.enriched}`);
    console.log(`Отфильтровано: ${stats.filtered}`);
    console.log(`Записано в CSV: ${stats.written}`);
    console.log(`Ошибок: ${stats.errors}`);
    console.log(`Время выполнения: ${elapsed.toFixed(2)} сек`);
    console.log(`Средняя скорость: ${speed} объектов/сек`);
    console.log(`Файл: ${OUTPUT_FILE}`);
}

// 8. Демонстрация отмены конвейера по короткому таймауту
async function demonstrateTimeout() {
    console.log('\n=== Отмена по таймауту ===');
    console.log('Запуск демонстрации с таймаутом 1 сек...');

    const controller = new AbortController();

    const slowSource = Readable.from(async function* () {
        let id = 1;
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 100));
            yield { id: id++, name: 'Максим', group: GROUP };
        }
    }(), { objectMode: true });

    const slowTransform = new Transform({
        objectMode: true,
        transform(student, encoding, callback) {
            setTimeout(() => callback(null, student), 100);
        }
    });

    const sink = new Writable({
        objectMode: true,
        write(student, encoding, callback) {
            callback();
        }
    });

    const timer = setTimeout(() => controller.abort(), 1000);

    try {
        await pipeline(slowSource, slowTransform, sink, {
            signal: controller.signal
        });
    } catch (error) {
        console.log('✖ Таймаут! Обработка отменена');
        console.log('✔ Потоки закрываются через pipeline()');
    } finally {
        clearTimeout(timer);
    }
}

// 9. Альтернативный способ: async iterator
async function demonstrateAsyncIterator() {
    console.log('\n=== Сравнение с async iterator ===');

    const source = Readable.from(
        Array.from({ length: 1000 }, (_, index) => ({
            id: index + 1,
            name: `Студент ${index + 1}`,
            group: GROUP,
            grade: 2 + ((index % 31) / 10)
        })),
        { objectMode: true }
    );

    let processed = 0;
    let filtered = 0;
    const start = Date.now();

    for await (const student of source) {
        if (student.grade > 3) {
            processed++;
        } else {
            filtered++;
        }
    }

    const elapsed = (Date.now() - start) / 1000;

    console.log(`[ASYNC] Обработано: ${processed} записей`);
    console.log(`[ASYNC] Отфильтровано: ${filtered} записей`);
    console.log(`[ASYNC] Время: ${elapsed.toFixed(3)} сек`);
    console.log(
        `[ASYNC] Скорость: ${Math.round(1000 / Math.max(elapsed, 0.001))} записей/сек`
    );
}

async function main() {
    await runPipeline();
    await demonstrateTimeout();
    await demonstrateAsyncIterator();

    console.log('\n✔ Все демонстрации завершены');
}

main().catch(error => {
    console.error('Критическая ошибка:', error);
    process.exitCode = 1;
});