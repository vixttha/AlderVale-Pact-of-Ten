// Preserve every real subprocess except the GUI browser opener on the hosted desktop.
import childProcess from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';

const realSpawn = childProcess.spawn;
childProcess.spawn = function spawn(command, args, options) {
  if (command !== 'explorer.exe') return realSpawn(command, args, options);
  console.log('Vault suppressed browser launch');
  if (process.env.ALDER_VAULT_READY_FILE) {
    writeFileSync(process.env.ALDER_VAULT_READY_FILE, String(args[0]));
  }
  const browser = new EventEmitter();
  browser.unref = () => browser;
  return browser;
};
syncBuiltinESMExports();
