
import inquirer from 'inquirer';

const args = process.argv.slice(2);
const command = args[0];

function getOption(name) {
    const index = args.indexOf(name);

    if (
        index !== -1 &&
        args[index + 1] &&
        !args[index + 1].startsWith('--')
    ) {
        return args[index + 1];
    }

    const item = args.find(arg => arg.startsWith(`${name}=`));

    return item ? item.split('=').slice(1).join('=') : undefined;
}

function hasFlag(name) {
    return args.includes(name);
}

function showError(message) {
    console.error(`Ошибка: ${message}`);
    process.exitCode = 1;
}

async function readStdin() {
    return new Promise(resolve => {
        let data = '';

        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => {
            data += chunk;
        });
        process.stdin.on('end', () => {
            resolve(data.trim());
        });
    });
}

async function main() {
    if (command !== 'init') {
        console.log('Использование: node init.mjs init [опции]');
        console.log(
            'Опции: --name, --type, --typescript, --eslint, ' +
            '--prettier, --jest, --git, --no-interactive'
        );
        return;
    }

    let name = getOption('--name');
    let type = getOption('--type');
    let options = [];
    let useGit = hasFlag('--git');
    let token = '';

    const hasInputFlags = args.some(arg =>
        [
            '--name',
            '--type',
            '--typescript',
            '--eslint',
            '--prettier',
            '--jest',
            '--git'
        ].includes(arg)
    );

    const nonInteractive =
        hasFlag('--no-interactive') || !process.stdin.isTTY;

    // Чтение данных из stdin, если они переданы через конвейер.
    let stdinData = '';

    if (!process.stdin.isTTY) {
        stdinData = await readStdin();
    }

    // Если название не указано параметром, берём его из stdin.
    if (!name && stdinData) {
        name = stdinData.split(/\r?\n/)[0].trim();
    }

    // Неинтерактивный режим.
    if (nonInteractive) {
        if (!name) {
            showError(
                'в неинтерактивном режиме необходимо указать название через --name или stdin'
            );
            return;
        }

        if (!type) {
            showError(
                'в неинтерактивном режиме необходимо указать --type'
            );
            return;
        }

        options = [
            ...(hasFlag('--typescript') ? ['TypeScript'] : []),
            ...(hasFlag('--eslint') ? ['ESLint'] : []),
            ...(hasFlag('--prettier') ? ['Prettier'] : []),
            ...(hasFlag('--jest') ? ['Jest'] : [])
        ];
    } else if (hasInputFlags && name && type) {
        // Все обязательные параметры уже переданы через командную строку.
        options = [
            ...(hasFlag('--typescript') ? ['TypeScript'] : []),
            ...(hasFlag('--eslint') ? ['ESLint'] : []),
            ...(hasFlag('--prettier') ? ['Prettier'] : []),
            ...(hasFlag('--jest') ? ['Jest'] : [])
        ];
    } else {
        // Интерактивный режим с вопросами.
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Введите название проекта:',
                default: name || 'my-project',
                when: !name
            },
            {
                type: 'select',
                name: 'type',
                message: 'Выберите тип проекта:',
                choices: [
                    { name: 'Веб-приложение', value: 'web' },
                    { name: 'CLI-приложение', value: 'cli' },
                    { name: 'Библиотека', value: 'library' },
                    { name: 'Микросервис', value: 'microservice' }
                ],
                when: !type
            },
            {
                type: 'checkbox',
                name: 'options',
                message: 'Выберите дополнительные опции:',
                choices: [
                    'TypeScript',
                    'ESLint',
                    'Prettier',
                    'Jest'
                ]
            },
            {
                type: 'confirm',
                name: 'useGit',
                message: 'Использовать Git?',
                default: true
            },
            {
                type: 'password',
                name: 'token',
                message: 'Введите токен доступа (можно оставить пустым):'
            }
        ]);

        name = name || answers.name;
        type = type || answers.type;
        options = answers.options || [];
        useGit = answers.useGit;
        token = answers.token || '';
    }

    // Проверка названия проекта.
    if (!name || !name.trim()) {
        showError('название проекта не может быть пустым');
        return;
    }

    // Проверка типа проекта.
    const types = ['web', 'cli', 'library', 'microservice'];

    if (!types.includes(type)) {
        showError(
            `недопустимый тип проекта "${type}". ` +
            `Допустимые значения: ${types.join(', ')}`
        );
        return;
    }

    // Вывод результата.
    console.log(`✓ Проект "${name}" успешно инициализирован!`);
    console.log(`Тип: ${type === 'cli' ? 'CLI-утилита' : type}`);
    console.log(
        `Опции: ${options.length ? options.join(', ') : 'не выбраны'}`
    );
    console.log(`Git: ${useGit ? 'да' : 'нет'}`);

    if (token) {
        console.log('Токен доступа: получен');
    }
}

main().catch(error => {
    console.error(`Ошибка: ${error.message}`);
    process.exitCode = 1;
});
