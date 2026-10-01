import { deployProject } from '../services/project-service.mjs';

export async function runDeploy() {
    const result = await deployProject();
    console.log(result.message);
}