const Router = require('@koa/router');
const StudentController = require('../controllers/StudentController');
const validateStudent = require('../middleware/validateStudent');

const router = new Router({ prefix: '/api/students' });
const controller = new StudentController();

router.get('/', controller.getAll);
router.get('/stats', controller.getStats);
router.get('/search', controller.search);
router.post('/batch', controller.batchCreate);
router.get('/:id', controller.getById);
router.post('/', validateStudent, controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;