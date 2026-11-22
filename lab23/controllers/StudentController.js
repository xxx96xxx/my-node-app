const StudentService = require('../services/StudentService');

class StudentController {
  constructor() {
    this.service = new StudentService();
  }

  getAll = async (ctx) => {
    const page = Number(ctx.query.page) || 1;
    const limit = Number(ctx.query.limit) || 10;

    const result = await this.service.getAll({
      page,
      limit,
      group_name: ctx.query.group_name,
      course: ctx.query.course,
      sortBy: ctx.query.sortBy,
      order: ctx.query.order
    });

    ctx.body = {
      success: true,
      ...result
    };
  };

  getById = async (ctx) => {
    const student = await this.service.getById(ctx.params.id);

    if (!student) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Студент не найден' };
      return;
    }

    ctx.body = { success: true, data: student };
  };

  create = async (ctx) => {
    const student = await this.service.create(ctx.request.body);

    ctx.status = 201;
    ctx.body = { success: true, data: student };
  };

  update = async (ctx) => {
    const student = await this.service.update(
      ctx.params.id,
      ctx.request.body
    );

    if (!student) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Студент не найден' };
      return;
    }

    ctx.body = { success: true, data: student };
  };

  delete = async (ctx) => {
    const deleted = await this.service.delete(ctx.params.id);

    if (!deleted) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Студент не найден' };
      return;
    }

    ctx.body = { success: true, message: 'Студент удалён' };
  };

  search = async (ctx) => {
    const query = String(ctx.query.q || '').trim();

    if (!query) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Укажите параметр q' };
      return;
    }

    const data = await this.service.search(
      query,
      Number(ctx.query.limit) || 10
    );

    ctx.body = { success: true, data };
  };

  getStats = async (ctx) => {
    ctx.body = {
      success: true,
      data: await this.service.getStats()
    };
  };

  batchCreate = async (ctx) => {
    const students = ctx.request.body.students;

    if (!Array.isArray(students)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Поле students должно быть массивом'
      };
      return;
    }

    const result = await this.service.batchCreate(students);

    ctx.status = 201;
    ctx.body = { success: true, data: result };
  };
}

module.exports = StudentController;