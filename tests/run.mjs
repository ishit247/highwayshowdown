// Runs every behaviour check against the real game:  node tests/run.mjs
// Prints one line per check and exits non-zero if any fails. Takes a minute or two (software rendering).
import { openGame, installProbe } from './harness.mjs';
import { runChecks } from './checks.mjs';

const page = await openGame();
let failed = 0;
try {
  await installProbe(page);
  for (const r of await runChecks(page)) { if (!r.ok) failed++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (${r.detail})`); }
} finally { await page.close(); }
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exitCode = failed ? 1 : 0;
