async function errorHandler(ctx, next) {
    try {
        await next();
    } catch (error) {
        console.error('[ERROR]', error);

        if (error.code === 11000) {
            ctx.status = 409;
            ctx.body = {
                error: 'Пользователь с такими данными уже существует'
            };
            return;
        }

        const status = error.status || error.statusCode || 500;

        ctx.status = status;
        ctx.body = {
            error: status === 500
                ? 'Внутренняя ошибка сервера'
                : error.message
        };
    }
}

export default errorHandler;