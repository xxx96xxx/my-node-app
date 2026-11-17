const Router = require('@koa/router');
const controller = require('../controllers/students-controller');

const router = new Router({ prefix: '/api' });

router.get('/students', controller.getStudents);
router.get('/students/:id', controller.getStudent);
router.post('/students', controller.createStudent);
router.put('/students/:id', controller.updateStudent);
router.delete('/students/:id', controller.deleteStudent);

router.get('/metrics', controller.getMetrics);
router.get('/health', controller.getHealth);

module.exports = router;