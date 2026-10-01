import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import dotenv from 'dotenv';

import { connectDB, closeDB } from './db.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';

import errorHandler from './middleware/errorHandler.js';
import dbMiddleware from './middleware/dbMiddleware.js';
import groupHeader from './middleware/groupHeader.js';

import { koaSwagger } from 'koa2-swagger-ui';
import swaggerDocument from './config/swagger.js';

dotenv.config();

const app = new Koa();
const PORT = Number(process.env.PORT) || 3000;

// Обработка ошибок
app.use(errorHandler);

// Заголовок группы
app.use(groupHeader);

// Подключение к базе данных для обработки запросов
app.use(dbMiddleware);

// Обработка JSON
app.use(bodyParser());

// Swagger: JSON-документация
app.use(async (ctx, next) => {
    if (ctx.path === '/openapi.json') {
        ctx.type = 'application/json';
        ctx.body = swaggerDocument;
        return;
    }

    await next();
});

// Swagger UI
app.use(koaSwagger({
    routePrefix: '/docs',
    swaggerOptions: {
        spec: swaggerDocument
    }
}));

// Маршруты авторизации
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// Маршруты пользователей
app.use(usersRouter.routes());
app.use(usersRouter.allowedMethods());

// Ответ для неизвестных маршрутов
app.use((ctx) => {
    ctx.status = 404;
    ctx.body = {
        error: 'Маршрут не найден'
    };
});

// Запуск сервера
let server;

try {
    await connectDB();

    server = app.listen(PORT, () => {
        console.log(`[INFO] Сервер запущен: http://localhost:${PORT}`);
        console.log(`[INFO] Swagger: http://localhost:${PORT}/docs`);
    });
} catch (error) {
    console.error('[ERROR] Не удалось запустить сервер:', error);
    process.exit(1);
}

// Корректное завершение работы
async function shutdown() {
    console.log('[INFO] Завершение работы сервера...');

    if (server) {
        server.close();
    }

    await closeDB();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);