
export function handleError(error) {
    const message = error instanceof Error
        ? error.message
        : String(error);

    console.error(`Ошибка: ${message}`);
    process.exitCode = 1;
}

export function validateRequired(value, parameter) {
    if (!value || !String(value).trim()) {
        throw new Error(`необходимо указать параметр ${parameter}`);
    }
}
