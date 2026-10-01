const { Readable, Transform, Writable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

// 1. Преобразование строк в верхний регистр
class UpperCaseTransform extends Transform {
    _transform(chunk, encoding, callback) {
        const text = chunk.toString().trim();
        const result = `[BBMO-01-23] ${text.toUpperCase()}`;
        callback(null, result + '\n');
    }
}

// 2. Преобразование JSON-строк в объекты
class JsonParserTransform extends Transform {
    constructor() {
        super({ readableObjectMode: true });
        this.buffer = '';
    }

    _transform(chunk, encoding, callback) {
        this.buffer += chunk.toString();

        const lines = this.buffer.split('\n');
        this.buffer = lines.pop();

        try {
            for (const line of lines) {
                if (line.trim()) {
                    this.push(JSON.parse(line));
                }
            }
            callback();
        } catch (error) {
            callback(error);
        }
    }

    _flush(callback) {
        try {
            if (this.buffer.trim()) {
                this.push(JSON.parse(this.buffer));
            }
            callback();
        } catch (error) {
            callback(error);
        }
    }
}

// 3. Фильтрация объектов по группе
class FilterTransform extends Transform {
    constructor(group) {
        super({
            writableObjectMode: true,
            readableObjectMode: true
        });
        this.group = group;
    }

    _transform(student, encoding, callback) {
        if (student.group === this.group) {
            this.push(student);
        }
        callback();
    }
}

// Поток для вывода строк
class TextOutput extends Writable {
    _write(chunk, encoding, callback) {
        process.stdout.write(chunk.toString());
        callback();
    }
}

// Поток для вывода объектов
class ObjectOutput extends Writable {
    constructor(label = '[OBJECT]') {
        super({ objectMode: true });
        this.label = label;
    }

    _write(object, encoding, callback) {
        console.log(this.label, object);
        callback();
    }
}

// Фильтр строк для демонстрации цепочки
class TextFilterTransform extends Transform {
    _transform(chunk, encoding, callback) {
        const text = chunk.toString();

        if (text.includes('МАКСИМ')) {
            this.push(text);
        }

        callback();
    }
}

async function main() {
    // Демонстрация UpperCaseTransform
    console.log('=== Демонстрация Transform-потока ===');

    const textSource = Readable.from([
        'группа ббмо-01-23',
        'студент максим'
    ]);

    await pipeline(
        textSource,
        new UpperCaseTransform(),
        new TextOutput()
    );

    // Демонстрация JsonParserTransform
    console.log('\n=== Демонстрация JsonParserTransform ===');

    const jsonSource = Readable.from([
        '{"id":1,"name":"Максим","group":"BBMO-01-23"}\n',
        '{"id":2,"name":"Мария","group":"BBMO-02-23"}\n',
        '{"id":3,"name":"Пётр","group":"BBMO-01-23"}\n'
    ]);

    await pipeline(
        jsonSource,
        new JsonParserTransform(),
        new ObjectOutput('[PARSED]')
    );

    // Демонстрация FilterTransform и Object Mode
    console.log('\n=== Демонстрация Object Mode и FilterTransform ===');

    const students = [
        { id: 1, name: 'Максим', group: 'BBMO-01-23' },
        { id: 2, name: 'Мария', group: 'BBMO-02-23' },
        { id: 3, name: 'Пётр', group: 'BBMO-01-23' }
    ];

    const objectSource = Readable.from(students, { objectMode: true });

    await pipeline(
        objectSource,
        new FilterTransform('BBMO-01-23'),
        new ObjectOutput('[FILTERED]')
    );

    // Демонстрация асинхронного итератора
    console.log('\n=== Демонстрация async iterator ===');

    const asyncSource = Readable.from([
        'Данные 1',
        'Данные 2',
        'Данные 3'
    ]);

    let index = 0;

    for await (const chunk of asyncSource) {
        index++;
        console.log(`[ASYNC] Получен чанк ${index}: "${chunk.toString()}"`);
    }

    console.log('[ASYNC] Поток завершён');

    // Демонстрация цепочки Readable → UpperCase → Filter → Writable
    console.log('\n=== Цепочка Transform ===');
    console.log('Читаем → UpperCase → Filter → Записываем');

    const chainSource = Readable.from([
        'Студент Максим',
        'Студент Иван',
        'Группа ББМО-01-23',
        'Максим выполняет лабораторную работу'
    ]);

    await pipeline(
        chainSource,
        new UpperCaseTransform(),
        new TextFilterTransform(),
        new TextOutput()
    );

    console.log('\n=== Все демонстрации завершены ===');
}

main().catch(error => {
    console.error('Ошибка:', error.message);
    process.exitCode = 1;
});