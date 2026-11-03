import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { spawn } = require('node:child_process');
const { buildStudioCommandInput, navigateStudioCommandHistory, stripTerminalControlSequences } = require('../studio-terminal.cjs');

test('builds persistent command wrappers for Windows and POSIX shells', () => {
  const marker = '__YUNIHUB_DONE_test_1__';
  assert.match(buildStudioCommandInput('Write-Output ready', marker, 'win32'), /Write-Output ready;.*__YUNIHUB_DONE_test_1__/);
  assert.match(buildStudioCommandInput('Write-Output ready', marker, 'win32'), /LASTEXITCODE = 0/);
  assert.match(buildStudioCommandInput('printf ready', marker, 'linux'), /printf ready; printf/);
  assert.throws(() => buildStudioCommandInput('echo hi', 'bad-marker', 'win32'), /Invalid terminal command marker/);
});

test('removes terminal color escapes and normalizes line endings', () => {
  assert.equal(stripTerminalControlSequences('\u001b[32mReady\u001b[0m\r\nNext'), 'Ready\nNext');
});

test('cycles through command history and restores the current draft', () => {
  const history = ['npm test', 'npm run build'];
  const previous = navigateStudioCommandHistory(history, 2, '', -1, 'git status');
  assert.deepEqual(previous, { index: 1, draft: 'git status', value: 'npm run build' });

  const oldest = navigateStudioCommandHistory(history, previous.index, previous.draft, -1, previous.value);
  assert.deepEqual(oldest, { index: 0, draft: 'git status', value: 'npm test' });

  const restored = navigateStudioCommandHistory(history, oldest.index, oldest.draft, 1, oldest.value);
  assert.deepEqual(restored, { index: 1, draft: 'git status', value: 'npm run build' });
  assert.deepEqual(navigateStudioCommandHistory(history, restored.index, restored.draft, 1, restored.value), { index: 2, draft: 'git status', value: 'git status' });
});

test('PowerShell retains directory changes and emits command completion markers', { skip: process.platform !== 'win32' }, async () => {
  const marker = '__YUNIHUB_DONE_cwd_check__';
  const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NoExit', '-Command', '$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()'], {
    cwd: process.cwd(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });

  const exited = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('PowerShell test timed out.')); }, 8000);
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('close', (code) => { clearTimeout(timeout); resolve(code); });
  });
  const lines = [
    'Set-Location $env:TEMP',
    buildStudioCommandInput('Write-Output YUNI_ONE', marker, 'win32'),
    'Write-Output (Get-Location).Path',
    'exit'
  ];
  child.stdin.end(lines.join('\r\n'));
  const exitCode = await exited;

  assert.equal(exitCode, 0);
  assert.match(output, /YUNI_ONE/);
  assert.match(output, new RegExp(`${marker}:0`));
  assert.match(output, new RegExp(process.env.TEMP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
});
