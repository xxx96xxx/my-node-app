import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/).required(),
    age: Joi.number().integer().min(16).max(100).required(),
    course: Joi.number().integer().min(1).max(4).optional(),
    password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

function createToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
    );
}

export async function register(ctx) {
    const { error, value } = registerSchema.validate(ctx.request.body, {
        abortEarly: false,
        convert: true,
        stripUnknown: true
    });

    if (error) {
        ctx.status = 400;
        ctx.body = {
            error: error.details.map((item) => item.message).join('; ')
        };
        return;
    }

    const users = ctx.db.collection('users');
    const email = value.email.trim().toLowerCase();

    const existingUser = await users.findOne({ email });

    if (existingUser) {
        ctx.status = 409;
        ctx.body = { error: 'Пользователь с таким email уже существует' };
        return;
    }

    const password_hash = await bcrypt.hash(value.password, 10);

    const user = {
        name: value.name.trim(),
        email,
        group_name: value.group_name,
        age: Number(value.age),
        ...(value.course !== undefined && { course: Number(value.course) }),
        password_hash,
        role: 'user',
        created_at: new Date(),
        updated_at: new Date()
    };

    const result = await users.insertOne(user);
    const createdUser = { ...user, _id: result.insertedId };

    ctx.status = 201;
    ctx.body = {
        message: 'Регистрация успешно завершена',
        token: createToken(createdUser),
        data: {
            _id: createdUser._id,
            name: createdUser.name,
            email: createdUser.email,
            group_name: createdUser.group_name,
            age: createdUser.age,
            course: createdUser.course,
            role: createdUser.role
        }
    };
}

export async function login(ctx) {
    const { error, value } = loginSchema.validate(ctx.request.body, {
        abortEarly: false,
        convert: true,
        stripUnknown: true
    });

    if (error) {
        ctx.status = 400;
        ctx.body = {
            error: error.details.map((item) => item.message).join('; ')
        };
        return;
    }

    const email = value.email.trim().toLowerCase();
    const user = await ctx.db.collection('users').findOne({ email });

    if (!user || !user.password_hash) {
        ctx.status = 401;
        ctx.body = { error: 'Неверный email или пароль' };
        return;
    }

    const passwordIsValid = await bcrypt.compare(
        value.password,
        user.password_hash
    );

    if (!passwordIsValid) {
        ctx.status = 401;
        ctx.body = { error: 'Неверный email или пароль' };
        return;
    }

    ctx.status = 200;
    ctx.body = {
        message: 'Вход выполнен успешно',
        token: createToken(user),
        data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            group_name: user.group_name,
            age: user.age,
            course: user.course,
            role: user.role
        }
    };
}

export async function getProfile(ctx) {
    const user = await ctx.db.collection('users').findOne(
        { email: ctx.state.user.email },
        { projection: { password_hash: 0 } }
    );

    if (!user) {
        ctx.status = 404;
        ctx.body = { error: 'Пользователь не найден' };
        return;
    }

    ctx.status = 200;
    ctx.body = { data: user };
}