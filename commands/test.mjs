import { spawn } from 'node:child_process';

export function runTests() {
    return new Promise((resolve, reject) => {
        const child = spawn(
            process.execPath,
            ['--test'],
            { stdio: 'inherit' }
        );

        child.on('error', reject);

        child.on('close', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Тесты завершились с кодом ${code}`));
            }
        });
    });
}