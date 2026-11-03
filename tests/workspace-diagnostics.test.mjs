import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { diagnoseWorkspace } = require('../workspace-diagnostics.cjs');
const temporaryDirectories = [];

function makeWorkspace() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'yunihub-diagnostics-'));
  temporaryDirectories.push(folder);
  return folder;
}

afterEach(() => {
  for (const folder of temporaryDirectories.splice(0)) fs.rmSync(folder, { recursive: true, force: true });
});

test('reports JavaScript and JSON syntax errors without executing source files', () => {
  const folder = makeWorkspace();
  const sideEffect = path.join(folder, 'must-not-run.txt');
  fs.writeFileSync(path.join(folder, 'broken.js'), `require('fs').writeFileSync(${JSON.stringify(sideEffect)}, 'ran');\nfunction {`);
  fs.writeFileSync(path.join(folder, 'broken.json'), '{ "ok": }');

  const result = diagnoseWorkspace(folder);

  assert.equal(result.checked, 2);
  assert.deepEqual(result.diagnostics.map((item) => item.file).sort(), ['broken.js', 'broken.json']);
  assert.ok(result.diagnostics.every((item) => item.severity === 'error' && item.line >= 1));
  assert.equal(fs.existsSync(sideEffect), false);
});

test('reports a clean workspace without diagnostics', () => {
  const folder = makeWorkspace();
  fs.writeFileSync(path.join(folder, 'index.js'), 'module.exports = 42;');
  fs.writeFileSync(path.join(folder, 'settings.json'), '{"ok":true}');

  const result = diagnoseWorkspace(folder);

  assert.equal(result.checked, 2);
  assert.deepEqual(result.diagnostics, []);
});

test('parses ESM and TSX correctly and reports TypeScript syntax errors', () => {
  const folder = makeWorkspace();
  fs.writeFileSync(path.join(folder, 'module.mjs'), "import value from 'value'; export default value;\n");
  fs.writeFileSync(path.join(folder, 'component.tsx'), 'const Component = () => <main />; export default Component;\n');
  fs.writeFileSync(path.join(folder, 'broken.ts'), 'const count: number = ;\n');

  const result = diagnoseWorkspace(folder);

  assert.equal(result.checked, 3);
  assert.deepEqual(result.diagnostics.map((item) => item.file), ['broken.ts']);
});
