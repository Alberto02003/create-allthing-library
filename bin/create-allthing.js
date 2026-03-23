#!/usr/bin/env node

const sub = process.argv[2];

if (sub === 'skills') {
  await import('../src/commands/skills-apply.js');
} else {
  await import('../src/cli.js');
}
