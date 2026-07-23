/**
 * electron/main.js
 * Electron Main Process — Realtime Wave Observer
 *
 * Responsibilities:
 *  1. Create BrowserWindow to host the React frontend
 *  2. Spawn Node.js backend & Python FastAPI as child processes
 *  3. Kill ALL child processes on quit to prevent zombie processes
 */

import { app, BrowserWindow, shell } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── ES Module dirname shim ────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Environment ───────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ─── Ports ─────────────────────────────────────────────────────────────────
const FRONTEND_PORT = 5173;   // Vite dev server
const BACKEND_PORT  = 3000;   // Express + Socket.IO
const AI_PORT       = 8000;   // Python FastAPI

// ─── Child process registry ─────────────────────────────────────────────────
/** @type {import('child_process').ChildProcess[]} */
const childProcesses = [];

/**
 * Spawn a process, pipe its stdio to the Electron console, and
 * register it so it can be killed on app quit.
 *
 * @param {string}   command
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions} options
 * @returns {import('child_process').ChildProcess}
 */
function spawnService(command, args, options = {}) {
  const proc = spawn(command, args, {
    stdio: 'pipe',
    shell: true,
    ...options,
  });

  const tag = `[${options._tag || command}]`;

  proc.stdout?.on('data', (d) => process.stdout.write(`${tag} ${d}`));
  proc.stderr?.on('data', (d) => process.stderr.write(`${tag} ${d}`));

  proc.on('error', (err) => console.error(`${tag} Spawn error:`, err));
  proc.on('exit', (code, signal) => {
    console.log(`${tag} exited — code=${code}, signal=${signal}`);
  });

  childProcesses.push(proc);
  return proc;
}

/**
 * Kill ALL registered child processes.
 * Uses SIGTERM first, then forces SIGKILL after 2s if still alive (Windows
 * maps SIGTERM to a regular terminate call via taskkill).
 */
function killAllChildren() {
  console.log('[Electron] Killing all child processes…');
  for (const proc of childProcesses) {
    if (proc.exitCode !== null || proc.killed) continue; // already dead

    try {
      // On Windows, taskkill /T kills the entire process tree (child of child)
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { shell: true });
      } else {
        proc.kill('SIGTERM');

        // Escalate to SIGKILL after 2 s if still running
        setTimeout(() => {
          if (!proc.killed) proc.kill('SIGKILL');
        }, 2000);
      }
    } catch (err) {
      console.error('[Electron] Failed to kill PID', proc.pid, err);
    }
  }
}

// ─── Start backend services (only in dev; in prod they are pre-bundled) ────
function startServices() {
  const root = isDev
    ? path.resolve(__dirname, '..')           // repo root in dev
    : path.dirname(app.getAppPath());         // resources dir in prod

  // ── Node.js Express + Socket.IO backend ──────────────────────────────
  if (isDev) {
    spawnService('node', ['server.js'], {
      cwd: path.join(root, 'backend'),
      _tag: 'BACKEND',
    });
  } else {
    // In production, Node.js is bundled; run via the extracted path
    spawnService('node', [path.join(root, 'backend', 'server.js')], {
      _tag: 'BACKEND',
    });
  }

  // ── Python FastAPI (AI Microservice) ────────────────────────────────
  if (isDev) {
    spawnService(
      'uvicorn',
      ['ai_service.main:app', '--host', '127.0.0.1', '--port', String(AI_PORT)],
      { cwd: root, _tag: 'AI-SERVICE' }
    );
  } else {
    // In production: run the PyInstaller-built executable
    const aiExe = path.join(process.resourcesPath, 'ai_engine.exe');
    spawnService(aiExe, [], { _tag: 'AI-SERVICE' });
  }
}

// ─── Wait until a local port is accepting connections ──────────────────────
/**
 * @param {number} port
 * @param {number} [maxRetries=30]
 * @param {number} [intervalMs=500]
 * @returns {Promise<void>}
 */
async function waitForPort(port, maxRetries = 30, intervalMs = 500) {
  const { createConnection } = (await import('net'));
  return new Promise((resolve, reject) => {
    let tries = 0;

    const attempt = () => {
      const sock = createConnection({ port, host: '127.0.0.1' });
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (++tries >= maxRetries) {
          reject(new Error(`Port ${port} not ready after ${maxRetries} retries`));
        } else {
          setTimeout(attempt, intervalMs);
        }
      });
    };
    attempt();
  });
}

// ─── Create Browser Window ─────────────────────────────────────────────────
let mainWindow = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'Realtime Wave Observer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,     // Security: isolate renderer from Node APIs
      nodeIntegration: false,     // Security: no direct Node access in renderer
      sandbox: false,             // Allow preload script to use Node built-ins
    },
    // Remove default menu in production
    autoHideMenuBar: !isDev,
  });

  // Open DevTools only in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Open external links in the system browser, not in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ── Load the app ───────────────────────────────────────────────────
  if (isDev) {
    // Wait for Vite dev server before loading
    await waitForPort(FRONTEND_PORT).catch(console.warn);
    await mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);
  } else {
    // Load the pre-built static frontend
    const indexPath = path.join(app.getAppPath(), 'frontend', 'dist', 'index.html');
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── App lifecycle ─────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  startServices();

  // Give backend a moment to boot before opening the window
  if (isDev) {
    await waitForPort(BACKEND_PORT).catch(console.warn);
  }

  await createWindow();

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ─── Quit handlers ─────────────────────────────────────────────────────────

// Triggered when all windows are closed
app.on('window-all-closed', () => {
  killAllChildren();
  // On macOS, conventionally apps stay open until explicitly quit via Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Last-chance cleanup before the process exits
app.on('before-quit', () => {
  killAllChildren();
});

// Catch uncaught errors in main process to ensure cleanup still happens
process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught Exception:', err);
  killAllChildren();
  app.quit();
});
