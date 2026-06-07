import { access, readFile } from 'node:fs/promises';

const requiredFiles = ['dist/index.html', 'dist/styles.css', 'dist/assets/app.js', 'dist/assets/domain.js'];
await Promise.all(requiredFiles.map((file) => access(file)));

const html = await readFile('dist/index.html', 'utf8');
const app = await readFile('dist/assets/app.js', 'utf8');

if (!html.includes('/assets/app.js')) {
  throw new Error('dist/index.html does not load the compiled app bundle.');
}

if (!app.includes('ProofPilot')) {
  throw new Error('compiled app bundle is missing ProofPilot demo content.');
}

console.log(`Verified build artifacts: ${requiredFiles.join(', ')}`);
