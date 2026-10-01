
const http = require('node:http');

const PORT = 3003;

let nextId = 4;

let users = [
    { id: 1, name: 'Максим', group: 'ББМО-01-23' },
    { id: 2, name: 'Алексей', group: 'ББМО-02-23' },
    { id: 3, name: 'Дмитрий', group: 'ББМО-01-23' }
];

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        const limit = 1024 * 1024;

        req.on('data', chunk => {
            size += chunk.length;

            if (size > limit) {
                reject(new Error('BODY_TOO_LARGE'));
                req.destroy();
                return;
            }

            chunks.push(chunk);
        });

        req.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf8'));
        });

        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname !== '/api/users' && !pathname.startsWith('/api/users/')) {
        sendJson(res, 404, { error: 'Маршрут не найден' });
        return;
    }

    const allowedMethods = pathname === '/api/users'
        ? ['GET', 'POST']
        : ['GET', 'PUT', 'DELETE'];

    if (!allowedMethods.includes(req.method)) {
        res.writeHead(405, {
            'Content-Type': 'application/json; charset=utf-8',
            'Allow': allowedMethods.join(', ')
        });
        res.end(JSON.stringify({ error: 'Метод не поддерживается' }));
        return;
    }

    if (pathname === '/api/users') {
        if (req.method === 'GET') {
            const group = url.searchParams.get('group');
            const filteredUsers = group
                ? users.filter(user => user.group === group)
                : users;

            sendJson(res, 200, {
                count: filteredUsers.length,
                data: filteredUsers
            });
            return;
        }

        if (req.method === 'POST') {
            try {
                const body = await readBody(req);
                const userData = JSON.parse(body);

                if (!userData.name || !userData.group) {
                    sendJson(res, 400, {
                        error: 'Поля name и group обязательны'
                    });
                    return;
                }

                const user = {
                    id: nextId++,
                    name: String(userData.name),
                    group: String(userData.group)
                };

                users.push(user);
                sendJson(res, 201, {
                    message: 'Пользователь создан',
                    data: user
                });
            } catch (error) {
                if (error.message === 'BODY_TOO_LARGE') {
                    if (!res.headersSent && !res.destroyed) {
                        sendJson(res, 413, { error: 'Тело запроса слишком большое' });
                    }
                } else {
                    sendJson(res, 400, { error: 'Некорректный JSON' });
                }
            }
            return;
        }
    }

    const idText = pathname.slice('/api/users/'.length);

    if (!/^\d+$/.test(idText)) {
        sendJson(res, 400, { error: 'Некорректный идентификатор' });
        return;
    }

    const id = Number(idText);
    const userIndex = users.findIndex(user => user.id === id);

    if (userIndex === -1) {
        sendJson(res, 404, { error: 'Пользователь не найден' });
        return;
    }

    if (req.method === 'GET') {
        sendJson(res, 200, { data: users[userIndex] });
        return;
    }

    if (req.method === 'PUT') {
        try {
            const body = await readBody(req);
            const userData = JSON.parse(body);

            if (!userData.name || !userData.group) {
                sendJson(res, 400, {
                    error: 'Поля name и group обязательны'
                });
                return;
            }

            users[userIndex] = {
                id,
                name: String(userData.name),
                group: String(userData.group)
            };

            sendJson(res, 200, {
                message: 'Пользователь обновлён',
                data: users[userIndex]
            });
        } catch (error) {
            if (error.message === 'BODY_TOO_LARGE') {
                if (!res.headersSent && !res.destroyed) {
                    sendJson(res, 413, { error: 'Тело запроса слишком большое' });
                }
            } else {
                sendJson(res, 400, { error: 'Некорректный JSON' });
            }
        }
        return;
    }

    if (req.method === 'DELETE') {
        const deletedUser = users[userIndex];
        users.splice(userIndex, 1);

        sendJson(res, 200, {
            message: 'Пользователь удалён',
            data: deletedUser
        });
    }
});

server.listen(PORT, () => {
    console.log(`REST-сервер запущен: http://localhost:${PORT}`);
});
