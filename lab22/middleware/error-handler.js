async function errorHandler(ctx, next) {
    try {
        await next();
    } catch (error) {
        console.error('[ERROR]', error.message);

        ctx.status = error.status || 500;
        ctx.body = {
            error: ctx.status === 500
                ? 'Внутренняя ошибка сервера'
                : error.message
        };
    }
}

module.exports = errorHandler;