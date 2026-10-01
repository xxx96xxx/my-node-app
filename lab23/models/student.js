const studentSchema = {
    bsonType: 'object',
    required: ['name', 'group_name', 'course'],
    properties: {
        name: {
            bsonType: 'string',
            minLength: 2
        },
        group_name: {
            bsonType: 'string'
        },
        course: {
            bsonType: 'int',
            minimum: 1,
            maximum: 4
        },
        grade: {
            bsonType: ['double', 'int', 'long', 'decimal'],
            minimum: 0,
            maximum: 10
        },
        email: {
            bsonType: 'string'
        }
    }
};

function validateStudent(data) {
    const errors = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return ['Тело запроса должно быть объектом'];
    }

    if (typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Имя должно содержать минимум 2 символа');
    }

    if (typeof data.group_name !== 'string' || !data.group_name.trim()) {
        errors.push('Необходимо указать группу');
    }

    if (!Number.isInteger(data.course) || data.course < 1 || data.course > 4) {
        errors.push('Курс должен быть целым числом от 1 до 4');
    }

    if (
        data.grade !== undefined &&
        (typeof data.grade !== 'number' || data.grade < 0 || data.grade > 10)
    ) {
        errors.push('Оценка должна быть числом от 0 до 10');
    }

    return errors;
}

module.exports = {
    studentSchema,
    validateStudent
};