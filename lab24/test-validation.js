import test from 'node:test';
import assert from 'node:assert/strict';
import { userSchema } from './models/user.js';

test('Корректные данные пользователя проходят валидацию', () => {
    const user = {
        name: 'Максим Минчук',
        email: 'maksim24@example.com',
        group_name: 'ББМО-01-23',
        age: 20,
        course: 2
    };

    const { error } = userSchema.validate(user);
    assert.equal(error, undefined);
});

test('Некорректный email не проходит валидацию', () => {
    const user = {
        name: 'Максим Минчук',
        email: 'wrong-email',
        group_name: 'ББМО-01-23',
        age: 20,
        course: 2
    };

    const { error } = userSchema.validate(user);
    assert.ok(error);
});

test('Возраст меньше 16 лет не проходит валидацию', () => {
    const user = {
        name: 'Максим Минчук',
        email: 'maksim24@example.com',
        group_name: 'ББМО-01-23',
        age: 15,
        course: 2
    };

    const { error } = userSchema.validate(user);
    assert.ok(error);
});

test('Некорректная группа не проходит валидацию', () => {
    const user = {
        name: 'Максим Минчук',
        email: 'maksim24@example.com',
        group_name: 'INVALID',
        age: 20,
        course: 2
    };

    const { error } = userSchema.validate(user);
    assert.ok(error);
});