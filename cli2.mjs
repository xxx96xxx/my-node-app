
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';

const program = new Command();

program
    .name('my-cli')
    .description('CLI-приложение для лабораторной работы №17')
    .version('1.0.0', '-V, --version')
    .option('-v, --verbose', 'подробный вывод');

const generate = program
    .command('generate')
    .description('сгенерировать отчёт')
    .option('-t, --type <type>', 'тип отчёта', 'html')
    .option('-o, --output <path>', 'путь для сохранения')
    .option('-f, --force', 'перезаписать существующий файл')
    .option('--dry-run', 'показать действия без выполнения')
    .option('-v, --verbose', 'подробный вывод');

generate.action((options) => {
    const allowedTypes = ['html', 'pdf', 'json', 'csv'];

    if (!allowedTypes.includes(options.type)) {
        console.error(`Ошибка: недопустимый тип отчёта "${options.type}".`);
        console.error(`Допустимые значения: ${allowedTypes.join(', ')}`);
        process.exitCode = 1;
        return;
    }

    const output = options.output || `./output.${options.type}`;

    if (options.verbose) {
        console.log('[VERBOSE] Запуск генерации отчёта...');
        console.log(`[VERBOSE] Тип отчёта: ${options.type}`);
        console.log(`[VERBOSE] Путь сохранения: ${output}`);
    }

    if (options.dryRun) {
        console.log(`[DRY-RUN] Будет сгенерирован отчёт типа: ${options.type}`);
        console.log(`[DRY-RUN] Файл будет сохранён в: ${output}`);
        console.log('[DRY-RUN] Действия не выполнены (режим проверки)');
        return;
    }

    if (fs.existsSync(output) && !options.force) {
        console.error(`Ошибка: файл "${output}" уже существует. Используйте --force.`);
        process.exitCode = 1;
        return;
    }

    const report = {
        title: 'Отчёт лабораторной работы №17',
        student: 'Сычевский Максим Васильевич',
        group: '401',
        type: options.type,
        date: new Date().toISOString()
    };

    let content;

    if (options.type === 'json') {
        content = JSON.stringify(report, null, 2);
    } else if (options.type === 'csv') {
        content = 'title,student,group,type,date\n' +
            `"${report.title}","${report.student}","${report.group}","${report.type}","${report.date}"`;
    } else if (options.type === 'html') {
        content = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>${report.title}</title>
</head>
<body>
<h1>${report.title}</h1>
<p>Студент: ${report.student}</p>
<p>Группа: ${report.group}</p>
<p>Тип отчёта: ${report.type}</p>
<p>Дата: ${report.date}</p>
</body>
</html>`;
    } else {
        content = `${report.title}\nСтудент: ${report.student}\nГруппа: ${report.group}\nДата: ${report.date}\n`;
    }

    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, content, 'utf8');

    console.log(`Отчёт успешно сгенерирован: ${output}`);
});

const convert = program
    .command('convert')
    .description('конвертировать файл')
    .requiredOption('-i, --input <path>', 'исходный файл')
    .requiredOption('-o, --output <path>', 'путь для сохранения')
    .option('-f, --force', 'перезаписать существующий файл')
    .option('-v, --verbose', 'подробный вывод');

convert.action((options) => {
    if (!fs.existsSync(options.input)) {
        console.error(`Ошибка: исходный файл "${options.input}" не найден.`);
        process.exitCode = 1;
        return;
    }

    if (fs.existsSync(options.output) && !options.force) {
        console.error(`Ошибка: файл "${options.output}" уже существует. Используйте --force.`);
        process.exitCode = 1;
        return;
    }

    if (options.verbose) {
        console.log('[VERBOSE] Запуск конвертации файла...');
        console.log(`[VERBOSE] Исходный файл: ${options.input}`);
        console.log(`[VERBOSE] Выходной файл: ${options.output}`);
    }

    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.copyFileSync(options.input, options.output);

    console.log(`Файл успешно обработан: ${options.output}`);
});

program.parse(process.argv);
