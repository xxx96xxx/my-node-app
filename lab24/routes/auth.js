import Router from '@koa/router';
import { register, login, getProfile } from '../controllers/auth.js';
import { auth } from '../middleware/auth.js';

const router = new Router({ prefix: '/api/auth' });

router.post('/register', register);
router.post('/login', login);
router.get('/profile', auth, getProfile);

export default router;