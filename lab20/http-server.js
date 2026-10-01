
const http = require('node:http');

const PORT = 3000;

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);

    if (req.url === '/' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        res.end(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <title>Главная страница</title>
            </head>
            <body>
                <h1>Добро пожаловать!</h1>
                <p>Студент: Максим</p>
                <p>Это главная страница HTTP-сервера Node.js.</p>
                <a href="/about">О странице</a>
            </body>
            </html>
        `);
        return;
    }

    if (req.url === '/about' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        res.end(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <title>О странице</title>
            </head>
            <body>
                <h1>О странице</h1>
                <p>HTTP-сервер создан на Node.js.</p>
                <p>Автор: Максим</p>
                <a href="/">На главную</a>
            </body>
            </html>
        `);
        return;
    }

    res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8'
    });

    res.end('404 — Страница не найдена');
});

server.listen(PORT, () => {
    console.log(`HTTP-сервер запущен: http://localhost:${PORT}`);
});
