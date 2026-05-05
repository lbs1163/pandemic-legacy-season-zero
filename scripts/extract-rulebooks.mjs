#!/usr/bin/env node
import { existsSync } from 'node:fs';

const sources = [
  'docs/en/pandemic_legacy_season_0_rulebook_english.pdf',
  'docs/ko/pandemic_legacy_season_0_rulebook_korean.pdf'
];

console.log('Rulebook extraction helper');
for (const source of sources) {
  console.log(`${existsSync(source) ? '✓' : '✗'} ${source}`);
}
console.log('\nThis repository currently keeps curated markdown in docs/*/rulebook.md.');
console.log('If higher-fidelity extraction is needed, install or provide a local PDF extraction tool and update this script.');
