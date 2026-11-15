/**
 * Builds a Hostinger Web App upload zip (no node_modules).
 * Usage: node scripts/pack-hostinger.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'zynextools-hostinger');
const zipPath = path.join(root, 'zynextools-hostinger.zip');

function rm(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

const SKIP_EXT = new Set(['.apk', '.map', '.aab']);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      // APKs live under downloads — skip the whole folder for a lean Hostinger zip.
      if (ent.name === 'downloads') continue;
      copyDir(from, to);
      continue;
    }
    if (SKIP_EXT.has(path.extname(ent.name).toLowerCase())) continue;
    fs.copyFileSync(from, to);
  }
}

// Always rebuild server.prod.ts → dist/server.cjs for Hostinger (never ship a Vite-linked server).
if (process.env.SKIP_BUILD === '1' && fs.existsSync(path.join(root, 'dist', 'server.cjs'))) {
  console.log('→ SKIP_BUILD=1 (reusing existing dist/) — prefer a full build for Hostinger');
  execSync('npm run build:server', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
} else {
  console.log('→ npm run build');
  execSync('npm run build', { cwd: root, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
}

rm(outDir);
fs.mkdirSync(outDir, { recursive: true });

copyDir(path.join(root, 'dist'), path.join(outDir, 'dist'));

const pkg = {
  name: 'zynextools',
  private: true,
  version: '1.0.0',
  description: 'ZynexTools Hostinger Node web app (Express + Vite dist)',
  engines: { node: '>=20' },
  main: 'dist/server.cjs',
  scripts: {
    // Hostinger runs this after install; server is fully prebundled.
    start: 'node dist/server.cjs',
    // No build step — dist/ is already in the zip.
    build: 'node -e "console.log(\'prebuilt\')"',
  },
  // Fully bundled in dist/server.cjs — empty deps = fast/reliable Hostinger npm install.
  dependencies: {},
};

fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkg, null, 2));
// Hostinger Express default looks for index.js / server.js at root.
fs.writeFileSync(
  path.join(outDir, 'index.js'),
  "require('./dist/server.cjs');\n",
);
fs.writeFileSync(
  path.join(outDir, 'server.js'),
  "require('./dist/server.cjs');\n",
);
fs.copyFileSync(path.join(root, 'DEPLOY-HOSTINGER.md'), path.join(outDir, 'DEPLOY-HOSTINGER.md'));
fs.copyFileSync(path.join(root, '.env.example'), path.join(outDir, '.env.example'));

fs.writeFileSync(
  path.join(outDir, 'README-UPLOAD.md'),
  `# ZynexTools — Hostinger Web App (manual upload)

1. In **client** Hostinger hPanel → **Websites** → **Create site** → **Web App**.
2. Choose **Upload** and upload \`zynextools-hostinger.zip\` (or unzip into the app root).
3. Node.js version: **20** or **22**.
4. Install command: \`npm install --omit=dev\`
5. Start command: \`npm start\` (runs \`node dist/server.cjs\`).
6. Set Node environment variables (same Supabase project — do not migrate DB):

   - \`NODE_ENV=production\`
   - \`VITE_SUPABASE_URL\` / \`VITE_SUPABASE_ANON_KEY\` (already baked into dist; still set for server)
   - \`SUPABASE_URL\` / \`SUPABASE_ANON_KEY\` / \`SUPABASE_SERVICE_ROLE_KEY\`
   - \`APP_URL\` / \`VITE_PORTAL_URL\` = your temp \`https://*.hostingersite.com\` (later \`https://www.zynextools.com\`)

7. Open \`https://YOUR-DOMAIN/api/health\` — should return \`{"status":"ok"}\`.

Keep Vercel live until this Hostinger app is verified.
`,
);

// Prefer system tar/Compress-Archive via PowerShell for Windows zip
rm(zipPath);
if (process.platform === 'win32') {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' },
  );
} else {
  execSync(`cd "${root}" && zip -r zynextools-hostinger.zip zynextools-hostinger`, { stdio: 'inherit' });
}

const st = fs.statSync(zipPath);
console.log(`✓ Packed ${zipPath} (${(st.size / (1024 * 1024)).toFixed(2)} MB)`);
