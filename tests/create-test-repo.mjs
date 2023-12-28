import { readFile, writeFile, mkdir, rm, readdir } from 'fs/promises';
import { exec } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const lineRegex = /^([A-Z]+): ?(.+?)(?: = (.+)|)$/;
const testDir = dirname(fileURLToPath(import.meta.url));
const rl = createInterface({ input, output });
const states = await readdir(join(testDir, 'states'));

states.forEach((name, i) => {
    console.log(`${i + 1}) ${name}`);
});

console.log();

const num = +(await rl.question('Enter state number: ')) - 1;
const state = states[num];
const contents = await readFile(join(testDir, 'states', state), 'utf-8');
const lines = contents.split(/\r?\n/);

await rm(join(testDir, 'test-repo'), {
    recursive: true,
    force: true,
});

await mkdir(join(testDir, 'test-repo'));

for (let line of lines) {
    const match = lineRegex.exec(line);

    if (!match) {
        throw new Error('Invalid line: ' + line);
    }

    const [, command, arg, extra] = match;

    switch (command) {
        case 'GIT':
            await new Promise((resolve) => {
                exec(
                    'git ' + arg,
                    {
                        cwd: join(testDir, 'test-repo'),
                    },
                    (_, out, err) => {
                        console.log(out);
                        console.error(err);
                        resolve();
                    },
                );
            });
            break;
        case 'FILE':
            await writeFile(join(testDir, 'test-repo', arg), extra);
            break;
        case 'SET':
            process.env[arg] = extra;
            break;
        case 'UNSET':
            delete process.env[arg];
    }
}

rl.close();
