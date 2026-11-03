import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createWorkspaceFile, listWorkspaceFiles, readWorkspaceFile, writeWorkspaceFile } = require('../workspace-files.cjs');
const temporaryDirectories = [];

function makeWorkspace() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'yunihub-workspace-'));
  temporaryDirectories.push(folder);
  return folder;
}

afterEach(() => {
  for (const folder of temporaryDirectories.splice(0)) fs.rmSync(folder, { recursive: true, force: true });
});

test('lists project files while excluding generated dependency folders', () => {
  const folder = makeWorkspace();
  fs.mkdirSync(path.join(folder, 'src'));
  fs.mkdirSync(path.join(folder, 'node_modules', 'sample'), { recursive: true });
  fs.mkdirSync(path.join(folder, '.vs', 'cache'), { recursive: true });
  fs.mkdirSync(path.join(folder, 'bin', 'Debug'), { recursive: true });
  fs.writeFileSync(path.join(folder, 'src', 'main.js'), 'console.log(1)');
  fs.writeFileSync(path.join(folder, 'node_modules', 'sample', 'index.js'), 'ignored');
  fs.writeFileSync(path.join(folder, '.vs', 'cache', 'workspace.json'), 'ignored');
  fs.writeFileSync(path.join(folder, 'bin', 'Debug', 'app.exe'), 'ignored');

  assert.deepEqual(listWorkspaceFiles(folder), ['src/main.js']);
});

test('reads and saves files only within the selected project root', () => {
  const folder = makeWorkspace();
  fs.writeFileSync(path.join(folder, 'main.py'), 'print(1)');

  assert.equal(readWorkspaceFile(folder, 'main.py'), 'print(1)');
  writeWorkspaceFile(folder, 'main.py', 'print(2)');
  assert.equal(fs.readFileSync(path.join(folder, 'main.py'), 'utf8'), 'print(2)');
  assert.throws(() => readWorkspaceFile(folder, '../outside.txt'), /inside the selected workspace/);
  assert.throws(() => readWorkspaceFile(folder, 'C:\\outside.txt'), /inside the selected workspace/);
  assert.throws(() => readWorkspaceFile(folder, 'C:outside.txt'), /inside the selected workspace/);
  assert.throws(() => writeWorkspaceFile(folder, '../outside.txt', 'blocked'), /inside the selected workspace/);
});

test('creates a new file without replacing an existing file', () => {
  const folder = makeWorkspace();
  fs.mkdirSync(path.join(folder, 'src'));

  createWorkspaceFile(folder, 'src/new.ts', 'export {}');
  assert.equal(readWorkspaceFile(folder, 'src/new.ts'), 'export {}');
  assert.throws(() => createWorkspaceFile(folder, 'src/new.ts', 'overwrite'), /already exists/);
});
