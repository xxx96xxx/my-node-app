const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');

const app = express();
const PORT = 3000;

const JWT_SECRET = 'lab16_secret_key_2026';
const GROUP = 'ББМО-01-23';

// ============================================================
// НАСТРОЙКИ EXPRESS
// ============================================================

app.use(express.json());

// Compression: gzip / deflate
app.use(compression());

// ============================================================
// LOGGER MIDDLEWARE
// ============================================================

app.use((req, res, next) => {
    const start = Date.now();
    const startTime = new Date();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const endTime = new Date();

        const line =
            `[${formatDate(startTime)}] ` +
            `${req.method} ${req.originalUrl} ` +
            `${res.statusCode} - ${duration}ms\n`;

        console.log(line.trim());

        fs.appendFileSync(
            'logs.txt',
            `[${formatDate(startTime)}] ${req.method} ${req.originalUrl} ` +
            `${res.statusCode} - ${duration}ms ` +
            `(завершено: ${formatDate(endTime)})\n`
        );
    });

    next();
});

function formatDate(date) {
    return date.toLocaleString('ru-RU');
}

// ============================================================
// RATE LIMITER — НЕ БОЛЕЕ 100 ЗАПРОСОВ В МИНУТУ
// ============================================================

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Слишком много запросов',
        status: 429
    }
});

app.use(limiter);

// ============================================================
// ДАННЫЕ КНИГ
// ============================================================

let books = [
    {
        id: 1,
        title: 'Война и мир',
        author: 'Толстой',
        year: 1869,
        genre: 'роман',
        isbn: '978-5-17-123456-1',
        available: true,
        reviews: []
    },
    {
        id: 2,
        title: 'Преступление и наказание',
        author: 'Достоевский',
        year: 1866,
        genre: 'роман',
        isbn: '978-5-17-234567-2',
        available: true,
        reviews: []
    },
    {
        id: 3,
        title: 'Мастер и Маргарита',
        author: 'Булгаков',
        year: 1967,
        genre: 'роман',
        isbn: '978-5-17-345678-3',
        available: false,
        reviews: []
    },
    {
        id: 4,
        title: 'Евгений Онегин',
        author: 'Пушкин',
        year: 1833,
        genre: 'роман',
        isbn: '978-5-17-456789-4',
        available: true,
        reviews: []
    },
    {
        id: 5,
        title: 'Отцы и дети',
        author: 'Тургенев',
        year: 1862,
        genre: 'роман',
        isbn: '978-5-17-567890-5',
        available: true,
        reviews: []
    }
];

let nextId = 6;

// ============================================================
// ГЕНЕРАЦИЯ 100 КНИГ
// ============================================================

function generateBooks() {
    const titles = [
        'Тайна старого замка',
        'Последний рассвет',
        'Путь героя',
        'Звёздная дорога',
        'Город будущего',
        'Тени прошлого',
        'Забытый мир',
        'Последний путешественник',
        'Хроники времени',
        'Секрет библиотеки'
    ];

    const authors = [
        'Иванов',
        'Петров',
        'Сидоров',
        'Смирнов',
        'Кузнецов',
        'Попов',
        'Волков',
        'Соколов',
        'Морозов',
        'Новиков'
    ];

    const genres = [
        'роман',
        'фантастика',
        'детектив',
        'приключения',
        'история'
    ];

    for (let i = 0; i < 100; i++) {
        const title = titles[i % titles.length] + ` №${i + 1}`;
        const author = authors[i % authors.length];
        const year = 1900 + (i % 125);
        const genre = genres[i % genres.length];

        books.push({
            id: nextId,
            title,
            author,
            year,
            genre,
            isbn: `978-5-${String(100000 + nextId).padStart(6, '0')}-${i % 10}`,
            available: i % 3 !== 0,
            reviews: []
        });

        nextId++;
    }
}

generateBooks();

// ============================================================
// ВАЛИДАЦИЯ КНИГ
// ============================================================

const bookSchema = Joi.object({
    title: Joi.string().trim().min(1).required(),
    author: Joi.string().trim().min(1).required(),
    year: Joi.number().integer().min(1).max(new Date().getFullYear()).required(),
    genre: Joi.string().trim().min(1).required(),
    isbn: Joi.string().trim().optional(),
    available: Joi.boolean().optional()
});

// ============================================================
// JWT — ПОЛЬЗОВАТЕЛИ
// ============================================================

const users = [
    {
        id: 1,
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Администратор',
        role: 'admin'
    },
    {
        id: 2,
        email: 'student@example.com',
        password: 'student123',
        name: 'Студент',
        role: 'user'
    }
];

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: '2h'
        }
    );
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Требуется JWT-токен',
            status: 401
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Недействительный или просроченный JWT-токен',
            status: 401
        });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Доступ разрешён только администраторам',
            status: 403
        });
    }

    next();
}

// ============================================================
// КЭШ
// ============================================================

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCache(key) {
    const item = cache.get(key);

    if (!item) {
        return null;
    }

    if (Date.now() - item.time > CACHE_TTL) {
        cache.delete(key);
        return null;
    }

    return item.data;
}

function setCache(key, data) {
    cache.set(key, {
        data,
        time: Date.now()
    });
}

function clearCache() {
    cache.clear();
}

// ============================================================
// ГЛАВНАЯ СТРАНИЦА — ЗАДАНИЕ 1
// ============================================================

app.get('/', (req, res) => {
    const currentDate = new Date();

    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Лабораторная работа №16</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f2f2f2;
            margin: 0;
            padding: 40px;
        }

        .container {
            max-width: 900px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.15);
        }

        h1 {
            color: #222;
        }

        h2 {
            color: #444;
        }

        li {
            margin: 10px 0;
        }

        a {
            color: #0066cc;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        code {
            background: #eee;
            padding: 3px 6px;
            border-radius: 4px;
        }
    </style>
</head>

<body>
    <div class="container">

        <h1>Лабораторная работа №16</h1>

        <h2>
            Исследование методов создания простого сервера
            с использованием Express.js
        </h2>

        <p>
            <strong>Группа:</strong> ${GROUP}
        </p>

        <p>
            <strong>Текущая дата и время:</strong>
            ${currentDate.toLocaleString('ru-RU')}
        </p>

        <p>
            Добро пожаловать на сервер лабораторной работы!
        </p>

        <h2>Доступные маршруты</h2>

       <ul>
    <li>
        <a href="/">/</a> — Главная страница
    </li>

    <li>
        <a href="/about">/about</a> — О разработчике
    </li>

    <li>
        <a href="/contacts">/contacts</a> — Контактная информация
    </li>

    <li>
        <a href="/api/books">/api/books</a> — REST API всех книг
    </li>

    <li>
        <a href="/api/books/search?author=Толстой">
            /api/books/search?author=Толстой
        </a>
        — Поиск по автору
    </li>

    <li>
        <a href="/api/books/stats">/api/books/stats</a> — Статистика
    </li>

    <li>
        <a href="/api-docs">/api-docs</a> — Swagger документация
    </li>

    <li>
        <a href="/error">/error</a> — Тест синхронной ошибки
    </li>

    <li>
        <a href="/async-error">/async-error</a> — Тест асинхронной ошибки
    </li>
</ul>

    </div>
</body>
</html>
    `);
});

// ============================================================
// ABOUT
// ============================================================

app.get('/about', (req, res) => {
    res.send(`
        <h1>О разработчике</h1>
        <p><strong>Студент:</strong> Сычевский Максим Васильевич</p>
        <p><strong>Группа:</strong> ${GROUP}</p>
        <p>Лабораторная работа №16 по Express.js.</p>
        <p><a href="/">Вернуться на главную</a></p>
    `);
});

// ============================================================
// CONTACTS
// ============================================================

app.get('/contacts', (req, res) => {
    res.send(`
        <h1>Контактная информация</h1>
        <p><strong>Студент:</strong> Сычевский Максим Васильевич</p>
        <p><strong>Группа:</strong> ${GROUP}</p>
        <p><strong>Email:</strong> student@example.com</p>
        <p><a href="/">Вернуться на главную</a></p>
    `);
});

// ============================================================
// AUTH — РЕГИСТРАЦИЯ
// ============================================================

app.post('/auth/register', (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({
            error: 'Необходимо указать email, пароль и имя',
            status: 400
        });
    }

    if (users.some(user => user.email === email)) {
        return res.status(400).json({
            error: 'Пользователь уже существует',
            status: 400
        });
    }

    const user = {
        id: users.length + 1,
        email,
        password,
        name,
        role: 'user'
    };

    users.push(user);

    res.status(201).json({
        message: 'Регистрация выполнена успешно',
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        }
    });
});

// ============================================================
// AUTH — LOGIN
// ============================================================

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    const user = users.find(
        user => user.email === email && user.password === password
    );

    if (!user) {
        return res.status(401).json({
            error: 'Неверный email или пароль',
            status: 401
        });
    }

    const token = createToken(user);

    res.json({
        message: 'Вход выполнен успешно',
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        }
    });
});

// ============================================================
// API BOOKS
// ============================================================

// GET /api/books
app.get('/api/books', authenticateToken, (req, res) => {
    const cacheKey = req.originalUrl;

    const cached = getCache(cacheKey);

    if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
    }

    let result = [...books];

    // Поиск
    if (req.query.search) {
        const search = req.query.search.toLowerCase();

        result = result.filter(book =>
            book.title.toLowerCase().includes(search) ||
            book.author.toLowerCase().includes(search)
        );
    }

    // Фильтр по автору
    if (req.query.author) {
        result = result.filter(
            book => book.author.toLowerCase() === req.query.author.toLowerCase()
        );
    }

    // Фильтр по году
    if (req.query.year) {
        result = result.filter(
            book => book.year === Number(req.query.year)
        );
    }

    // Диапазон годов
    if (req.query.yearFrom) {
        result = result.filter(
            book => book.year >= Number(req.query.yearFrom)
        );
    }

    if (req.query.yearTo) {
        result = result.filter(
            book => book.year <= Number(req.query.yearTo)
        );
    }

    // Сортировка
    if (req.query.sort === 'title') {
        result.sort((a, b) =>
            a.title.localeCompare(b.title)
        );
    }

    if (req.query.sort === '-year') {
        result.sort((a, b) => b.year - a.year);
    }

    // Пагинация
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);

    const total = result.length;
    const totalPages = Math.ceil(total / limit);

    const start = (page - 1) * limit;

    const paginated = result.slice(
        start,
        start + limit
    );

    const response = {
        page,
        limit,
        total,
        totalPages,
        books: paginated
    };

    setCache(cacheKey, response);

    res.set('X-Cache', 'MISS');

    res.json(response);
});

// ============================================================
// SEARCH
// ============================================================

app.get('/api/books/search', authenticateToken, (req, res) => {
    const author = req.query.author;

    if (!author) {
        return res.status(400).json({
            error: 'Необходимо указать параметр author',
            status: 400
        });
    }

    const result = books.filter(
        book => book.author.toLowerCase() === author.toLowerCase()
    );

    res.json(result);
});

// ============================================================
// STATS
// ============================================================

app.get('/api/books/stats', authenticateToken, (req, res) => {
    const authors = {};
    const genres = {};

    books.forEach(book => {
        authors[book.author] =
            (authors[book.author] || 0) + 1;

        genres[book.genre] =
            (genres[book.genre] || 0) + 1;
    });

    const years = books.map(book => book.year);

    res.json({
        totalBooks: books.length,
        booksByAuthor: authors,
        oldestYear: Math.min(...years),
        newestYear: Math.max(...years),
        booksByGenre: genres
    });
});

// ============================================================
// AVAILABLE
// ============================================================

app.get('/api/books/available', authenticateToken, (req, res) => {
    const result = books.filter(book => book.available);

    res.json(result);
});

// ============================================================
// RECOMMENDATIONS
// ============================================================

app.get('/api/books/recommendations', authenticateToken, (req, res) => {
    const genre = req.query.genre;

    if (!genre) {
        return res.status(400).json({
            error: 'Укажите жанр через ?genre=',
            status: 400
        });
    }

    const result = books.filter(
        book => book.genre.toLowerCase() === genre.toLowerCase()
    );

    res.json(result);
});

// ============================================================
// GET BOOK BY ID
// ============================================================

app.get('/api/books/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);

    const book = books.find(book => book.id === id);

    if (!book) {
        return res.status(404).json({
            error: 'Книга не найдена',
            status: 404
        });
    }

    res.json(book);
});

// ============================================================
// POST BOOK
// ТОЛЬКО ADMIN
// ============================================================

app.post('/api/books', authenticateToken, requireAdmin, (req, res) => {
    const { error, value } = bookSchema.validate(req.body);

    if (error) {
        return res.status(400).json({
            error: error.details[0].message,
            status: 400
        });
    }

    const duplicate = books.find(
        book =>
            book.title.toLowerCase() === value.title.toLowerCase() &&
            book.author.toLowerCase() === value.author.toLowerCase()
    );

    if (duplicate) {
        return res.status(400).json({
            error: 'Книга с таким названием и автором уже существует',
            status: 400
        });
    }

    const newBook = {
        id: nextId++,
        title: value.title,
        author: value.author,
        year: value.year,
        genre: value.genre,
        isbn: value.isbn || `978-5-${Date.now()}`,
        available:
            value.available !== undefined
                ? value.available
                : true,
        reviews: []
    };

    books.push(newBook);

    clearCache();

    res.status(201).json(newBook);
});

// ============================================================
// PUT BOOK
// ============================================================

app.put('/api/books/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);

    const book = books.find(book => book.id === id);

    if (!book) {
        return res.status(404).json({
            error: 'Книга не найдена',
            status: 404
        });
    }

    const updateSchema = Joi.object({
        title: Joi.string().trim().min(1).optional(),
        author: Joi.string().trim().min(1).optional(),
        year: Joi.number().integer().min(1).max(new Date().getFullYear()).optional(),
        genre: Joi.string().trim().min(1).optional(),
        isbn: Joi.string().trim().optional(),
        available: Joi.boolean().optional()
    });

    const { error, value } = updateSchema.validate(req.body);

    if (error) {
        return res.status(400).json({
            error: error.details[0].message,
            status: 400
        });
    }

    Object.assign(book, value);

    clearCache();

    res.json(book);
});

// ============================================================
// DELETE BOOK
// ТОЛЬКО ADMIN
// ============================================================

app.delete('/api/books/:id', authenticateToken, requireAdmin, (req, res) => {
    const id = Number(req.params.id);

    const index = books.findIndex(book => book.id === id);

    if (index === -1) {
        return res.status(404).json({
            error: 'Книга не найдена',
            status: 404
        });
    }

    const deletedBook = books.splice(index, 1)[0];

    clearCache();

    res.json({
        message: 'Книга успешно удалена',
        book: deletedBook
    });
});

// ============================================================
// REVIEWS
// ============================================================

app.post('/api/books/:id/reviews', authenticateToken, (req, res) => {
    const id = Number(req.params.id);

    const book = books.find(book => book.id === id);

    if (!book) {
        return res.status(404).json({
            error: 'Книга не найдена',
            status: 404
        });
    }

    const { text } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({
            error: 'Текст отзыва не должен быть пустым',
            status: 400
        });
    }

    const review = {
        id: book.reviews.length + 1,
        user: req.user.name,
        text: text.trim(),
        date: new Date().toISOString()
    };

    book.reviews.push(review);

    res.status(201).json(review);
});

// ============================================================
// EXPORT JSON
// ============================================================

app.get('/api/books/export', authenticateToken, (req, res) => {
    res.json(books);
});

// ============================================================
// IMPORT CSV
// ============================================================

app.post('/api/books/import', authenticateToken, requireAdmin, (req, res) => {
    const csv = req.body.csv;

    if (!csv) {
        return res.status(400).json({
            error: 'Передайте CSV в поле csv',
            status: 400
        });
    }

    const lines = csv.trim().split(/\r?\n/);

    let imported = 0;

    for (const line of lines) {
        const parts = line.split(',');

        if (parts.length < 4) {
            continue;
        }

        const title = parts[0].trim();
        const author = parts[1].trim();
        const year = Number(parts[2].trim());
        const genre = parts[3].trim();

        if (!title || !author || !year || !genre) {
            continue;
        }

        books.push({
            id: nextId++,
            title,
            author,
            year,
            genre,
            isbn: `978-5-${Date.now()}-${nextId}`,
            available: true,
            reviews: []
        });

        imported++;
    }

    clearCache();

    res.json({
        message: 'Импорт завершён',
        imported
    });
});

// ============================================================
// ERROR TEST
// ============================================================

app.get('/error', (req, res, next) => {
    const error = new Error('Тестовая синхронная ошибка');
    error.status = 500;

    next(error);
});

// ============================================================
// ASYNC ERROR TEST
// ============================================================

app.get('/async-error', async (req, res) => {
    throw new Error('Тестовая асинхронная ошибка');
});

// ============================================================
// SWAGGER
// ============================================================

const swaggerDocument = {
    openapi: '3.0.0',

    info: {
        title: 'Library REST API',
        version: '1.0.0',
        description: 'API лабораторной работы №16'
    },

    servers: [
        {
            url: 'http://localhost:3000'
        }
    ],

    paths: {
        '/api/books': {
            get: {
                summary: 'Получить список книг',
                responses: {
                    200: {
                        description: 'Список книг'
                    }
                }
            },

            post: {
                summary: 'Добавить книгу',
                responses: {
                    201: {
                        description: 'Книга создана'
                    }
                }
            }
        },

        '/api/books/{id}': {
            get: {
                summary: 'Получить книгу',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'integer'
                        }
                    }
                ],
                responses: {
                    200: {
                        description: 'Книга'
                    },
                    404: {
                        description: 'Книга не найдена'
                    }
                }
            },

            put: {
                summary: 'Обновить книгу',
                responses: {
                    200: {
                        description: 'Книга обновлена'
                    }
                }
            },

            delete: {
                summary: 'Удалить книгу',
                responses: {
                    200: {
                        description: 'Книга удалена'
                    }
                }
            }
        },

        '/auth/register': {
            post: {
                summary: 'Регистрация пользователя',
                responses: {
                    201: {
                        description: 'Пользователь зарегистрирован'
                    }
                }
            }
        },

        '/auth/login': {
            post: {
                summary: 'Авторизация',
                responses: {
                    200: {
                        description: 'JWT токен'
                    }
                }
            }
        }
    }
};

app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

// ============================================================
// 404
// ============================================================

app.use((req, res, next) => {
    const error = new Error('Маршрут не найден');
    error.status = 404;

    next(error);
});

// ============================================================
// ЦЕНТРАЛИЗОВАННЫЙ ОБРАБОТЧИК ОШИБОК
// ============================================================

app.use((err, req, res, next) => {
    console.error('ERROR:', err.message);

    const status = err.status || 500;

    res.status(status).json({
        error: err.message,
        status
    });
});

// ============================================================
// ЗАПУСК СЕРВЕРА
// ============================================================

app.listen(PORT, () => {
    console.log('========================================');
    console.log('Лабораторная работа №16');
    console.log(`Группа: ${GROUP}`);
    console.log(`Сервер запущен: http://localhost:${PORT}`);
    console.log(`Книг загружено: ${books.length}`);
    console.log(`Swagger: http://localhost:${PORT}/api-docs`);
    console.log('========================================');
});