import jwt from 'jsonwebtoken';

export async function auth(ctx, next) {
    const authorization = ctx.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = {
            error: 'Необходима авторизация'
        };
        return;
    }

    const token = authorization.slice(7);

    try {
        ctx.state.user = jwt.verify(token, process.env.JWT_SECRET);
        await next();
    } catch {
        ctx.status = 401;
        ctx.body = {
            error: 'Недействительный или просроченный токен'
        };
    }
}

export async function requireAdmin(ctx, next) {
    if (ctx.state.user?.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
            error: 'Недостаточно прав'
        };
        return;
    }

    await next();
}