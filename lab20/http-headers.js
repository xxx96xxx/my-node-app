
const http = require('node:http');

const PORT = 3001;

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);

    if (req.method !== 'GET') {
        res.writeHead(405, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Allow': 'GET'
        });
        res.end('Метод не поддерживается');
        return;
    }

    if (req.url === '/headers') {
        // Получение заголовков входящего запроса
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify(req.headers, null, 2));
    } 
    else if (req.url === '/headers/set') {
        // Установка собственных заголовков ответа
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Student': 'Maksim',
            'X-Lab': 'HTTP-Request',
            'Cache-Control': 'no-cache'
        });

        res.end('Собственные HTTP-заголовки установлены');
    } 
    else if (req.url === '/headers/check') {
        // Проверка заголовков входящего запроса
        const userAgent = req.headers['user-agent'];
        const accept = req.headers['accept'];

        const result = {
            userAgent: userAgent || 'Не указан',
            accept: accept || 'Не указан',
            hasUserAgent: Boolean(userAgent),
            hasAccept: Boolean(accept)
        };

        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify(result, null, 2));
    } 
    else {
        res.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8'
        });

        res.end('Страница не найдена');
    }
});

server.listen(PORT, () => {
    console.log(`Сервер заголовков запущен: http://localhost:${PORT}`);
});
