const metrics = {
  startedAt: new Date(),
  totalRequests: 0,
  totalErrors: 0,
  requestsByMethod: {},
  requestsByPath: {},
  totalResponseTime: 0
};

async function metricsMiddleware(ctx, next) {
  const start = Date.now();

  metrics.totalRequests++;

  const method = ctx.method;
  const path = ctx.path;

  metrics.requestsByMethod[method] =
    (metrics.requestsByMethod[method] || 0) + 1;

  metrics.requestsByPath[path] =
    (metrics.requestsByPath[path] || 0) + 1;

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    metrics.totalResponseTime += duration;

    if (ctx.status >= 400) {
      metrics.totalErrors++;
    }

    ctx.set('X-Response-Time', `${duration}ms`);
  }
}

function getMetrics() {
  return {
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: metrics.startedAt,
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    averageResponseTime: metrics.totalRequests
      ? Number((metrics.totalResponseTime / metrics.totalRequests).toFixed(2))
      : 0,
    requestsByMethod: metrics.requestsByMethod,
    requestsByPath: metrics.requestsByPath,
    memory: process.memoryUsage()
  };
}

module.exports = {
  metricsMiddleware,
  getMetrics
};