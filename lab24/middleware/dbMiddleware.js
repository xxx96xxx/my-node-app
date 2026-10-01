import { getDB } from '../db.js';

async function dbMiddleware(ctx, next) {
    ctx.db = getDB();
    await next();
}

export default dbMiddleware;