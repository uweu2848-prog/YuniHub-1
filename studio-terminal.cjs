'use strict';

function buildStudioCommandInput(command, marker, platform = process.platform) {
  if (typeof command !== 'string' || !command.trim()) throw new Error('Enter a command first.');
  if (typeof marker !== 'string' || !/^__YUNIHUB_DONE_[a-zA-Z0-9_-]+__$/.test(marker)) {
    throw new Error('Invalid terminal command marker.');
  }
  if (platform === 'win32') {
    return `$global:LASTEXITCODE = 0; ${command}; $__yuniSuccess = $?; $__yuniStatus = 0; if ($LASTEXITCODE -is [int] -and $LASTEXITCODE -ne 0) { $__yuniStatus = $LASTEXITCODE } elseif (-not $__yuniSuccess) { $__yuniStatus = 1 }; [Console]::Out.WriteLine('${marker}:' + $__yuniStatus)\r\n`;
  }
  return `${command}; printf '\\n${marker}:%s\\n' "$?"\n`;
}

function stripTerminalControlSequences(value) {
  return String(value ?? '')
    .replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

function navigateStudioCommandHistory(history, index, draft, direction, currentValue) {
  const entries = Array.isArray(history) ? history : [];
  if (!entries.length) return { index: 0, draft: '', value: currentValue };

  index = Number.isInteger(index) ? Math.max(0, Math.min(index, entries.length)) : entries.length;
  if (direction < 0) {
    if (index === entries.length) draft = currentValue;
    index = Math.max(0, index - 1);
  } else {
    index = Math.min(entries.length, index + 1);
  }

  return { index, draft, value: index === entries.length ? draft : entries[index] || '' };
}

module.exports = { buildStudioCommandInput, navigateStudioCommandHistory, stripTerminalControlSequences };
