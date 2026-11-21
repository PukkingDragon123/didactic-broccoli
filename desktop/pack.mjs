// Build the Windows x64 desktop release: vite build -> desktop/game -> Electron package -> zip.
// Usage (from repo root): node desktop/pack.mjs   (works on Linux; no Wine needed)
import { execSync } from 'node:child_process';
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const out = join(here, 'out');
const sh = (c, cwd = repo) => execSync(c, { cwd, stdio: 'inherit' });

sh('npx vite build');
rmSync(join(here, 'game'), { recursive: true, force: true });
cpSync(join(repo, 'dist'), join(here, 'game'), { recursive: true });
rmSync(join(repo, 'dist'), { recursive: true, force: true });
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const [dir] = await packager({
  dir: here, out, platform: 'win32', arch: 'x64', overwrite: true, asar: false,
  name: 'GachaGarage', executableName: 'GachaGarage', icon: join(here, 'build', 'icon.ico'),
  appCopyright: 'Gacha Garage', win32metadata: { CompanyName: 'Gacha Garage', ProductName: 'Gacha Garage', FileDescription: 'Gacha Garage' },
  ignore: [/^\/out($|\/)/, /^\/pack\.mjs$/, /^\/node_modules($|\/)/, /^\/README/],
  prune: false,
});
const zip = join(out, 'GachaGarage-win-x64.zip');
sh(`cd "${dir}" && zip -qr -9 "${zip}" .`, here);
rmSync(join(here, 'game'), { recursive: true, force: true });
console.log('built', zip, existsSync(zip));
