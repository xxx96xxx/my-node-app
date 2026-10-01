
const os = require('node:os');

// Маскирование MAC-адреса
function maskMac(mac) {
    if (!mac || mac === '00:00:00:00:00:00') {
        return mac || 'не указан';
    }

    const parts = mac.split(':');

    if (parts.length !== 6) {
        return 'некорректный MAC';
    }

    return `${parts[0]}:${parts[1]}:${parts[2]}:**:**:**`;
}

// Получение сетевых интерфейсов
function getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const result = [];
    let mainInterface = null;

    for (const [name, addresses] of Object.entries(interfaces)) {
        for (const address of addresses || []) {
            const family = typeof address.family === 'number'
                ? (address.family === 4 ? 'IPv4' : 'IPv6')
                : address.family;

            const item = {
                name,
                family,
                address: address.address,
                mac: maskMac(address.mac),
                internal: address.internal
            };

            result.push(item);

            // Первый внешний IPv4 становится основным интерфейсом.
            if (
                !mainInterface &&
                family === 'IPv4' &&
                !address.internal
            ) {
                mainInterface = item;
            }
        }
    }

    return { result, mainInterface };
}

// Получение информации о пользователе
function getUserInfo() {
    const user = os.userInfo();
    const platform = os.platform();
    const isWindows = platform === 'win32';

    return {
        username: user.username,
        uid: isWindows ? null : user.uid,
        gid: isWindows ? null : user.gid,
        homedir: os.homedir(),
        shell: process.env.SHELL || process.env.COMSPEC || 'не определена',
        isRoot: isWindows ? null : user.uid === 0
    };
}

// Основная программа
function main() {
    const { result: interfaces, mainInterface } = getNetworkInfo();
    const user = getUserInfo();

    console.log('=== Сетевые интерфейсы ===');

    const interfaceNames = [...new Set(
        interfaces.map(item => item.name)
    )];

    if (interfaceNames.length === 0) {
        console.log('Сетевые интерфейсы не найдены');
    }

    for (const name of interfaceNames) {
        console.log(`\nИнтерфейс: ${name}`);

        const addresses = interfaces.filter(item => item.name === name);

        for (const address of addresses) {
            console.log(`${address.family}: ${address.address}`);
            console.log(`MAC: ${address.mac}`);
            console.log(`Внутренний: ${address.internal ? 'да' : 'нет'}`);
        }
    }

    console.log(`\nВсего интерфейсов: ${interfaceNames.length}`);

    if (mainInterface) {
        console.log(
            `Основной интерфейс: ${mainInterface.name} (${mainInterface.address})`
        );
    } else {
        console.log('Основной внешний IPv4-интерфейс не найден');
    }

    console.log('\n=== Информация о пользователе ===');
    console.log(`Имя пользователя: ${user.username}`);

    if (user.uid !== null) {
        console.log(`UID: ${user.uid}`);
        console.log(`GID: ${user.gid}`);
    } else {
        console.log('UID: недоступен в Windows');
        console.log('GID: недоступен в Windows');
    }

    console.log(`Домашняя директория: ${user.homedir}`);
    console.log(`Оболочка: ${user.shell}`);
    console.log('Группа: ББМО-01-23');

    if (user.isRoot === null) {
        console.log('Проверка root: неприменима в Windows');
    } else {
        console.log(`Проверка root: ${user.isRoot ? 'да' : 'нет'}`);
    }
}

try {
    main();
} catch (error) {
    console.error(`Ошибка: ${error.message}`);
    process.exitCode = 1;
}
