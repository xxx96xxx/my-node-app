const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const studentsRouter = require('./routes/students');
const errorHandler = require('./middleware/error-handler');
const { metrics } = require('./controllers/students-controller');
const pool = require('./db');

const app = new Koa();
const PORT = Number(process.env.PORT || 3000);

app.use(errorHandler);
app.use(bodyParser());

app.use(async (ctx, next) => {
    metrics.requests++;

    const started = Date.now();

    try {
        await next();
    } catch (error) {
        metrics.errors++;
        throw error;
    } finally {
        console.log(
            `${ctx.method} ${ctx.url} ${ctx.status} - ${Date.now() - started}ms`
        );
    }
});

app.use(studentsRouter.routes());
app.use(studentsRouter.allowedMethods());

app.on('error', error => {
    console.error('[SERVER ERROR]', error.message);
});

async function start() {
    try {
        await pool.query('SELECT 1');

        console.log('MySQL подключена');

        app.listen(PORT, () => {
            console.log(`Сервер запущен: http://localhost:${PORT}`);
            console.log(`API студентов: http://localhost:${PORT}/api/students`);
        });
    } catch (error) {
        console.error('Не удалось запустить сервер:', error.message);
        process.exitCode = 1;
    }
}

start();