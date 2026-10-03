/**
 * Remove baba2.demo (Carla falsa) + reabre ofertas reais que apontavam para ela.
 * Preferência: Admin SDK (purge_test_admin). Fallback: purge_test_firebase.
 *
 * node scripts/remove_demo_carla.mjs --execute
 */
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const toolDir = join(__dir, '../../tool');
const EXECUTE = process.argv.includes('--execute');
const flag = EXECUTE ? '--execute' : '--dry-run';

console.log('Carla demo = baba2.demo@babaon.test.local (uid xCXLa7vhbdanea6mbIe2H60FdXm1)\n');

const admin = spawnSync('node', [join(toolDir, 'purge_test_admin.mjs'), flag], {
  stdio: 'inherit',
  cwd: toolDir,
});
if (admin.status === 0 && EXECUTE) {
  console.log('\nAdmin OK.');
  process.exit(0);
}
if (admin.status === 0 && !EXECUTE) {
  console.log('\nDry-run admin OK. Rode com --execute');
}

console.log('\nAdmin indisponível ou falhou — tentando purge cliente…');
const client = spawnSync('node', [join(toolDir, 'purge_test_firebase.mjs'), flag], {
  stdio: 'inherit',
  cwd: toolDir,
});
process.exit(client.status ?? 1);
