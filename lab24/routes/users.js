import Router from '@koa/router';

import {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getUserStats,
    exportUsers
} from '../controllers/users.js';

const router = new Router({
    prefix: '/api/users'
});

// Специальные маршруты располагаются до /:id
router.get('/stats', getUserStats);
router.get('/export', exportUsers);

// CRUD
router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;