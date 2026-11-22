async function groupHeader(ctx, next) {
    ctx.set('X-Group', 'BBMO-01-23');
    await next();
}

export default groupHeader;