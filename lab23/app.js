require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const { connectDB, closeDB } = require('./config/database');
const studentRoutes = require('./routes/studentRoutes');
const errorHandler = require('./middleware/errorHandler');
const {
  metricsMiddleware,
  getMetrics
} = require('./middleware/metrics');

const app = new Koa();
const PORT = process.env.PORT || 3000;

app.use(errorHandler);
app.use(metricsMiddleware);
app.use(bodyParser());

app.use(async (ctx, next) => {
  if (ctx.path === '/' && ctx.method === 'GET') {
    ctx.body = {
      success: true,
      message: 'Лабораторная работа №23 — REST API студентов',
      author: 'Максим',
      group: 'ББМО-01-23'
    };
    return;
  }

  if (ctx.path === '/api/metrics' && ctx.method === 'GET') {
    ctx.body = {
      success: true,
      data: getMetrics()
    };
    return;
  }

  await next();
});

app.use(studentRoutes.routes());
app.use(studentRoutes.allowedMethods());

app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = {
    success: false,
    error: 'Маршрут не найден'
  };
});

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[INFO] Сервер запущен: http://localhost:${PORT}`);
      console.log('[INFO] Группа: ББМО-01-23');
      console.log('[INFO] Автор: Максим');
    });

    const shutdown = async () => {
      console.log('\n[INFO] Завершение работы сервера...');

      server.close(async () => {
        await closeDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[ERROR] Не удалось запустить сервер:', error.message);
    process.exit(1);
  }
}

startServer();