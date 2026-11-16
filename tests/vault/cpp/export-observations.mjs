import { observeDamage, observeHealth, observeReplay, observeTurns } from './combat-observations.mjs';
import { observeSave } from './save-observations.mjs';

function canonical(value) {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`Non-finite observation: ${value}`);
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

const suites = {
  'G06-001': observeDamage,
  'G06-002': observeHealth,
  'G06-003': observeTurns,
  'G28-007': observeSave,
  'G09-002': observeReplay,
};
process.stdout.write('aldervale-cpp-contract-v1\n');
for (const [suite, observe] of Object.entries(suites)) {
  try {
    for (const [scenario, values] of Object.entries(observe())) {
      process.stdout.write(`${suite}\t${scenario}\t${JSON.stringify(canonical(values))}\n`);
    }
  } catch (error) {
    throw new Error(`${suite}: could not observe authoritative game behavior`, { cause: error });
  }
}
