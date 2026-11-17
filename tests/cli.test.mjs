
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { initializeProject, buildProject, deployProject } from '../services/project-service.mjs';

test('инициализация создаёт проект и package.json', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-test-'));
    const projectName = path.join(tempDir, 'sample-project');

    try {
        const result = await initializeProject(projectName, 'cli', ['Jest']);

        const packageJson = JSON.parse(
            await fs.readFile(path.join(result, 'package.json'), 'utf8')
        );

        assert.equal(packageJson.name, 'sample-project');
        assert.equal(packageJson.description, 'Проект типа cli');
        assert.deepEqual(packageJson.options, ['Jest']);

        const indexExists = await fs.access(path.join(result, 'index.js'))
            .then(() => true)
            .catch(() => false);

        assert.equal(indexExists, true);
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
});

test('сборка возвращает успешный статус', async () => {
    const result = await buildProject();

    assert.equal(result.status, 'success');
});

test('развёртывание возвращает успешный статус', async () => {
    const result = await deployProject();

    assert.equal(result.status, 'success');
});
