import { cpSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs';

const out = '.vercel/output';

if (!existsSync('dist/config.json')) {
  console.error('ERROR: dist/config.json not found. Did the vite build fail?');
  process.exit(1);
}

console.log('dist/ contents:', readdirSync('dist'));
if (existsSync('dist/server')) {
  console.log('dist/server contents:', readdirSync('dist/server').slice(0, 10));
}

// Always rebuild .vercel/output from dist/ for a deterministic structure
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/functions/__server.func`, { recursive: true });
mkdirSync(`${out}/static`, { recursive: true });

cpSync('dist/config.json', `${out}/config.json`);
cpSync('dist/server', `${out}/functions/__server.func`, { recursive: true });
cpSync('dist/client', `${out}/static`, { recursive: true });

console.log('.vercel/output contents:', readdirSync(out));
console.log('.vercel/output/functions contents:', readdirSync(`${out}/functions`));
console.log('Vercel output prepared successfully at .vercel/output/');
