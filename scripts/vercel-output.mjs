import { cpSync, mkdirSync, existsSync, rmSync } from 'fs';

const out = '.vercel/output';

// If vite.config.ts already directed output correctly, nothing to do
if (existsSync(`${out}/config.json`)) {
  console.log('Output already at .vercel/output, nothing to do.');
  process.exit(0);
}

if (!existsSync('dist/config.json')) {
  console.error('dist/config.json not found — did the build fail?');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/functions/__server.func`, { recursive: true });
mkdirSync(`${out}/static`, { recursive: true });

cpSync('dist/config.json', `${out}/config.json`);
cpSync('dist/server', `${out}/functions/__server.func`, { recursive: true });
cpSync('dist/client', `${out}/static`, { recursive: true });

console.log('Vercel output prepared at .vercel/output/');
