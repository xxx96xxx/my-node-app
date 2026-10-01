
import { initializeProject } from '../services/project-service.mjs';
import { validateRequired } from '../utils/errors.mjs';

export async function runInit(args) {
    const name = args[0];
    const type = args[1] || 'cli';

    validateRequired(name, '--name');

    const allowedTypes = ['web', 'cli', 'library', 'microservice'];

    if (!allowedTypes.includes(type)) {
        throw new Error(`неизвестный тип проекта: ${type}`);
    }

    const projectPath = await initializeProject(name, type);

    console.log(`Проект создан: ${projectPath}`);
}
