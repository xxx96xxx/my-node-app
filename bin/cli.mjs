
import { runInit } from '../commands/init.mjs';
import { runBuild } from '../commands/build.mjs';
import { runTests } from '../commands/test.mjs';
import { runDeploy } from '../commands/deploy.mjs';
import { handleError } from '../utils/errors.mjs';

const [command, ...args] = process.argv.slice(2);

async function main() {
    switch (command) {
        case 'init':
            await runInit(args);
            break;

        case 'build':
            await runBuild();
            break;

        case 'test':
            await runTests();
            break;

        case 'deploy':
            await runDeploy();
            break;

        case '--help':
        case '-h':
        case undefined:
            console.log(`
CLI-приложение для лабораторной работы №17

Использование:
  my-cli init <название> [тип]
  my-cli build
  my-cli test
  my-cli deploy
  my-cli --help
            `);
            break;

        default:
            throw new Error(`неизвестная команда: ${command}`);
    }
}

main().catch(handleError);
