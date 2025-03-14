import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compile } from 'svelte/compiler';

const inputPath = join('src', 'lib', 'MapCalibrator.svelte');
const outputPath = join('dist', 'custom-element.js');

const source = await readFile(inputPath, 'utf-8');

const { js } = compile(source, {
	filename: inputPath,
	css: 'injected'
});

await writeFile(outputPath, js.code);
