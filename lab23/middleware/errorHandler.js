async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (error) {
    console.error('[ERROR]', error.message);

    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    };
  }
}

module.exports = errorHandler;