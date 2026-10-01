
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream');

const HTTP_PORT = 3004;
const HTTPS_PORT = 3443;

const PUBLIC_DIR = path.resolve(__dirname, 'public');

let requestCount = 0;
let responseBytes = 0;
const startedAt = Date.now();

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Middleware: логирование и базовые заголовки безопасности
function middleware(req, res, next) {
    const start = Date.now();

    requestCount++;

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    res.on('finish', () => {
        const duration = Date.now() - start;
        responseBytes += Number(res.getHeader('Content-Length')) || 0;

        console.log(
            `${req.method} ${req.url} -> ${res.statusCode} (${duration} ms)`
        );
    });

    next();
}

function sendText(res, statusCode, text) {
    res.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end(text);
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify(data, null, 2));
}

function getSafeFilePath(urlPath) {
    let decodedPath;

    try {
        decodedPath = decodeURIComponent(urlPath);
    } catch {
        return null;
    }

    const relativePath = decodedPath.replace(/^[/\\]+/, '');
    const filePath = path.resolve(PUBLIC_DIR, relativePath);

    // Проверка, что путь остаётся внутри public
    if (
        filePath !== PUBLIC_DIR &&
        !filePath.startsWith(PUBLIC_DIR + path.sep)
    ) {
        return null;
    }

    return filePath;
}

function serveStatic(req, res, urlPath) {
    const requestedPath = urlPath === '/' ? '/index.html' : urlPath;
    const filePath = getSafeFilePath(requestedPath);

    if (!filePath) {
        sendText(res, 403, 'Доступ запрещён');
        return;
    }

    fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
            sendText(res, 404, 'Файл не найден');
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[extension] || 'application/octet-stream';

        // ETag на основе размера и времени изменения файла
        const etag = `W/"${stats.size.toString(16)}-${Math.trunc(stats.mtimeMs).toString(16)}"`;
        const lastModified = stats.mtime.toUTCString();

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', lastModified);
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

        const ifNoneMatch = req.headers['if-none-match'];
        const ifModifiedSince = req.headers['if-modified-since'];

        if (ifNoneMatch && ifNoneMatch.split(',').map(v => v.trim()).includes(etag)) {
            res.writeHead(304);
            res.end();
            return;
        }

        if (!ifNoneMatch && ifModifiedSince) {
            const modifiedSince = Date.parse(ifModifiedSince);

            if (
                !Number.isNaN(modifiedSince) &&
                Math.floor(stats.mtimeMs / 1000) <= Math.floor(modifiedSince / 1000)
            ) {
                res.writeHead(304);
                res.end();
                return;
            }
        }

        res.writeHead(200);

        if (req.method === 'HEAD') {
            res.end();
            return;
        }

        const fileStream = fs.createReadStream(filePath);

        pipeline(fileStream, res, (streamError) => {
            if (streamError) {
                console.error('Ошибка потоковой передачи:', streamError.message);
            }
        });
    });
}

function app(req, res) {
    middleware(req, res, () => {
        let url;

        try {
            url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        } catch {
            sendText(res, 400, 'Некорректный URL');
            return;
        }

        const pathname = url.pathname;

        if (pathname === '/metrics') {
            if (req.method !== 'GET') {
                res.setHeader('Allow', 'GET');
                sendText(res, 405, 'Метод не поддерживается');
                return;
            }

            sendJson(res, 200, {
                requests: requestCount,
                responseBytes,
                uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
                startedAt: new Date(startedAt).toISOString()
            });
            return;
        }

        if (pathname === '/stream') {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                res.setHeader('Allow', 'GET, HEAD');
                sendText(res, 405, 'Метод не поддерживается');
                return;
            }

            const filePath = path.join(PUBLIC_DIR, 'index.html');

            fs.stat(filePath, (error, stats) => {
                if (error || !stats.isFile()) {
                    sendText(res, 404, 'Файл для передачи не найден');
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Content-Length': stats.size,
                    'X-Transfer-Mode': 'stream'
                });

                if (req.method === 'HEAD') {
                    res.end();
                    return;
                }

                pipeline(fs.createReadStream(filePath), res, (streamError) => {
                    if (streamError) {
                        console.error('Ошибка передачи:', streamError.message);
                    }
                });
            });
            return;
        }

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.setHeader('Allow', 'GET, HEAD');
            sendText(res, 405, 'Метод не поддерживается');
            return;
        }

        serveStatic(req, res, pathname);
    });
}

const httpServer = http.createServer(app);

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP-сервер: http://localhost:${HTTP_PORT}`);
});

// HTTPS запускается, если сертификат и закрытый ключ существуют
const keyPath = path.join(__dirname, 'cert', 'key.pem');
const certPath = path.join(__dirname, 'cert', 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const httpsServer = https.createServer({
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    }, app);

    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`HTTPS-сервер: https://localhost:${HTTPS_PORT}`);
    });
} else {
    console.log('HTTPS не запущен: отсутствуют cert/key.pem или cert/cert.pem');
    console.log('Создай сертификат по инструкции к заданию.');
}
