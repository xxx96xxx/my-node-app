const { validateStudent } = require('../models/student');

async function validateStudentMiddleware(ctx, next) {
  try {
    validateStudent(ctx.request.body);
    await next();
  } catch (error) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: error.message
    };
  }
}

module.exports = validateStudentMiddleware;