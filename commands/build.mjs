import { buildProject } from '../services/project-service.mjs';

export async function runBuild() {
    const result = await buildProject();
    console.log(result.message);
}