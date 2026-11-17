
const args = process.argv.slice(2);

const GROUP = '401';
const FULL_NAME = 'Сычевский Максим Васильевич';

function showHelp() {
    console.log('Использование: my-cli <команда> [аргументы]');
    console.log('');
    console.log('Доступные команды:');
    console.log('  greet <имя>  - поприветствовать пользователя');
    console.log('  info         - вывести информацию о группе');
    console.log('  --help       - показать справку');
}

function greet(name) {
    if (!name) {
        console.error('Ошибка: укажите имя пользователя.');
        process.exitCode = 1;
        return;
    }

    console.log(
        `Привет, ${name}! Добро пожаловать в CLI-приложение группы ${GROUP}.`
    );
}

function showInfo() {
    console.log(`Группа: ${GROUP}`);
    console.log(`Студент: ${FULL_NAME}`);
    console.log('Лабораторная работа: №17');
    console.log(`Дата: ${new Date().toLocaleDateString('ru-RU')}`);
}

function main() {
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        showHelp();
        return;
    }

    if (command === 'greet') {
        greet(args[1]);
        return;
    }

    if (command === 'info') {
        showInfo();
        return;
    }

    console.error(`Ошибка: неизвестная команда "${command}"`);
    console.error('Для справки используйте: my-cli --help');
    process.exitCode = 1;
}

main();
