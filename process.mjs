
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const command = args[0];

const useColor = Boolean(process.stdout.isTTY);

function colorize(color, message) {
    return useColor ? chalk[color](message) : message;
}

function log(message) {
    process.stderr.write(`${message}\n`);
}

function showError(message) {
    log(colorize('red', `Ошибка: ${message}`));
    process.exitCode = 1;
}

function getOption(name) {
    const index = args.indexOf(name);

    if (index !== -1 && args[index + 1]) {
        return args[index + 1];
    }

    const item = args.find(arg => arg.startsWith(`${name}=`));
    return item ? item.slice(name.length + 1) : undefined;
}

function getFiles() {
    const index = args.indexOf('--files');

    if (index === -1) {
        return [];
    }

    return args.slice(index + 1).filter(arg => !arg.startsWith('--'));
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processFiles(files, silent, verbose) {
    const results = [];
    const spinner = silent
        ? null
        : ora({
            text: 'Подготовка к обработке файлов...',
            stream: process.stderr
        }).start();

    const progress = silent
        ? null
        : new cliProgress.SingleBar({
            format: 'Прогресс |{bar}| {percentage}% | {value}/{total}',
            barCompleteChar: '█',
            barIncompleteChar: '░',
            stream: process.stderr,
            hideCursor: true,
            clearOnComplete: false
        });

    try {
        if (spinner) {
            spinner.text = 'Проверка файлов...';
        }

        for (const file of files) {
            await fs.access(file);
        }

        if (spinner) {
            spinner.succeed('Файлы найдены');
        }

        if (progress) {
            progress.start(files.length, 0);
        }

        for (const [index, file] of files.entries()) {
            if (verbose) {
                log(colorize('cyan', `Обработка: ${file}`));
            }

            const content = await fs.readFile(file, 'utf8');

            results.push({
                file: path.basename(file),
                size: Buffer.byteLength(content, 'utf8'),
                lines: content.length === 0
                    ? 0
                    : content.split(/\r?\n/).length
            });

            await delay(400);

            if (progress) {
                progress.update(index + 1);
            }
        }

        if (progress) {
            progress.stop();
        }

        if (spinner) {
            spinner.succeed('Обработка завершена');
        }

        // Данные выводятся в stdout, чтобы их можно было перенаправить в файл.
        if (!silent) {
            process.stdout.write(
                `${JSON.stringify(results, null, 2)}\n`
            );
        }

        return results;
    } catch (error) {
        if (progress) {
            progress.stop();
        }

        if (spinner && spinner.isSpinning) {
            spinner.fail('Обработка прервана');
        }

        throw error;
    }
}

async function main() {
    if (command !== 'process') {
        log('Использование: node process.mjs process --files <файлы> [--verbose] [--silent]');
        return;
    }

    const files = getFiles();
    const silent = args.includes('--silent');
    const verbose = args.includes('--verbose');

    if (files.length === 0) {
        showError('укажите хотя бы один файл через --files');
        return;
    }

    await processFiles(files, silent, verbose);
}

main().catch(error => {
    showError(error.message);
});
