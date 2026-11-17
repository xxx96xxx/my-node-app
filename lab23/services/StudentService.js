const StudentDAO = require('../dao/StudentDAO');

class StudentService {
  constructor() {
    this.studentDAO = new StudentDAO();
    this.cache = new Map();
    this.cacheTTL = 60 * 1000;
  }

  clearCache() {
    this.cache.clear();
  }

  async getAll(options) {
    return this.studentDAO.findAll(options);
  }

  async getById(id) {
    const cached = this.cache.get(id);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const student = await this.studentDAO.findById(id);

    if (student) {
      this.cache.set(id, {
        data: student,
        timestamp: Date.now()
      });
    }

    return student;
  }

  async create(data) {
    const student = await this.studentDAO.create(data);
    this.clearCache();
    return student;
  }

  async update(id, data) {
    const student = await this.studentDAO.update(id, data);
    this.clearCache();
    return student;
  }

  async delete(id) {
    const deleted = await this.studentDAO.delete(id);

    if (deleted) {
      this.clearCache();
    }

    return deleted;
  }

  async search(query, limit) {
    return this.studentDAO.search(query, limit);
  }

  async getStats() {
    return this.studentDAO.getStats();
  }

  async batchCreate(students) {
    const result = await this.studentDAO.batchCreate(students);
    this.clearCache();
    return result;
  }
}

module.exports = StudentService;