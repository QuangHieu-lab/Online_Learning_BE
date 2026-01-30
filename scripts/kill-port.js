#!/usr/bin/env node

/**
 * Kill process using PORT (default 5000)
 * Usage: node scripts/kill-port.js [port]
 */

import { execSync } from 'child_process';
import { platform } from 'os';

const port = process.argv[2] || process.env.PORT || 5000;

function killPortWin(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = out.trim().split('\n').filter((l) => l.includes('LISTENING'));
    const pids = new Set();
    for (const line of lines) {
      const match = line.match(/LISTENING\s+(\d+)/);
      if (match) pids.add(match[1]);
    }
    for (const pid of pids) {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
      console.log(`Killed PID ${pid}`);
    }
    if (pids.size === 0) {
      console.log(`No process found on port ${port}`);
    }
  } catch (e) {
    if (e.status === 1) {
      console.log(`No process found on port ${port}`);
    } else throw e;
  }
}

function killPortUnix(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'inherit' });
  } catch (e) {
    console.log(`No process found on port ${port}`);
  }
}

if (platform() === 'win32') {
  killPortWin(port);
} else {
  killPortUnix(port);
}
