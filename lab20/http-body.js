
const http = require('node:http');

const PORT = 3002;
const MAX_BODY_SIZE = 1024 * 1024; // 1 МБ

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        let tooLarge = false;

        req.on('data', (chunk) => {
            size += chunk.length;

            if (size > MAX_BODY_SIZE) {
                tooLarge = true;
                chunks.length = 0;
                return;
            }

            if (!tooLarge) {
                chunks.push(chunk);
            }
        });

        req.on('end', () => {
            if (tooLarge) {
                resolve({ tooLarge: true });
                return;
            }

            resolve({
                tooLarge: false,
                body: Buffer.concat(chunks).toString('utf8')
            });
        });

        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);

    if (req.url !== '/body') {
        res.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8'
        });
        res.end('Страница не найдена');
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Allow': 'POST'
        });
        res.end('Используйте метод POST');
        return;
    }

    try {
        const result = await readRequestBody(req);

        if (result.tooLarge) {
            res.writeHead(413, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
            res.end('Размер тела запроса превышает 1 МБ');
            return;
        }

        const contentType = (req.headers['content-type'] || '')
            .split(';')[0]
            .trim()
            .toLowerCase();

        let data;

        if (contentType === 'application/json') {
            try {
                data = JSON.parse(result.body);
            } catch {
                res.writeHead(400, {
                    'Content-Type': 'text/plain; charset=utf-8'
                });
                res.end('Некорректный JSON');
                return;
            }
        } else if (contentType === 'text/plain') {
            data = result.body;
        } else if (contentType === 'application/x-www-form-urlencoded') {
            data = Object.fromEntries(new URLSearchParams(result.body));
        } else {
            res.writeHead(415, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
            res.end('Неподдерживаемый тип содержимого');
            return;
        }

        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify({
            message: 'Данные успешно получены',
            contentType,
            data
        }, null, 2));
    } catch (error) {
        console.error(error);

        if (!res.headersSent) {
            res.writeHead(500, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
            res.end('Внутренняя ошибка сервера');
        }
    }
});

server.listen(PORT, () => {
    console.log(`Сервер обработки тела запущен: http://localhost:${PORT}`);
});
