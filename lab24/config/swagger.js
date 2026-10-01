const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Lab24 Users REST API',
        version: '1.0.0',
        description: 'REST API для управления пользователями на Koa.js и MongoDB'
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Локальный сервер'
        }
    ],
    paths: {
        '/api/users': {
            get: {
                summary: 'Получить список пользователей',
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        schema: { type: 'integer', default: 1 }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'integer', default: 10 }
                    },
                    {
                        name: 'group_name',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'search',
                        in: 'query',
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    200: { description: 'Список пользователей' }
                }
            },
            post: {
                summary: 'Создать пользователя',
                responses: {
                    201: { description: 'Пользователь создан' },
                    400: { description: 'Ошибка валидации' },
                    409: { description: 'Email уже существует' }
                }
            }
        },
        '/api/users/{id}': {
            get: {
                summary: 'Получить пользователя по ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    200: { description: 'Пользователь найден' },
                    404: { description: 'Пользователь не найден' }
                }
            },
            put: {
                summary: 'Обновить пользователя',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    200: { description: 'Пользователь обновлён' },
                    400: { description: 'Ошибка валидации' },
                    404: { description: 'Пользователь не найден' }
                }
            },
            delete: {
                summary: 'Удалить пользователя',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    200: { description: 'Пользователь удалён' },
                    404: { description: 'Пользователь не найден' }
                }
            }
        },
        '/api/users/stats': {
            get: {
                summary: 'Получить статистику пользователей',
                responses: {
                    200: { description: 'Статистика по группам' }
                }
            }
        },
        '/api/users/export': {
            get: {
                summary: 'Экспортировать пользователей в CSV',
                responses: {
                    200: { description: 'CSV-файл' }
                }
            }
        },
        '/api/auth/register': {
            post: {
                summary: 'Зарегистрировать пользователя',
                responses: {
                    201: { description: 'Регистрация выполнена' },
                    400: { description: 'Ошибка валидации' },
                    409: { description: 'Email уже существует' }
                }
            }
        },
        '/api/auth/login': {
            post: {
                summary: 'Войти и получить JWT',
                responses: {
                    200: { description: 'Вход выполнен' },
                    401: { description: 'Неверные учётные данные' }
                }
            }
        },
        '/api/auth/profile': {
            get: {
                summary: 'Получить профиль',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Профиль пользователя' },
                    401: { description: 'Требуется авторизация' }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    }
};

export default swaggerDocument;