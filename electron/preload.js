/**
 * electron/preload.js
 * Preload Script — Realtime Wave Observer
 *
 * This script runs in the renderer process BEFORE the web page loads.
 * It uses contextBridge to safely expose a minimal, controlled API to the
 * renderer (React app) without granting full Node.js access.
 *
 * Security model:
 *  - contextIsolation: true  → renderer JS cannot access Node globals
 *  - nodeIntegration: false  → renderer cannot require() Node modules
 *  - Only explicitly whitelisted APIs are exposed via window.electronAPI
 */

import { contextBridge, ipcRenderer } from 'electron';

// ─── Whitelisted IPC channels ───────────────────────────────────────────────
// Only channels listed here can be used by the renderer.
const ALLOWED_SEND_CHANNELS    = ['app:quit', 'app:minimize', 'app:maximize'];
const ALLOWED_RECEIVE_CHANNELS = ['app:update-available', 'app:update-ready', 'service:status'];

// ─── Expose API to renderer via window.electronAPI ─────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Send a one-way message from renderer → main process.
   * @param {string} channel
   * @param {...any} args
   */
  send: (channel, ...args) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      console.warn(`[Preload] Blocked send on unknown channel: "${channel}"`);
    }
  },

  /**
   * Listen for a message from main → renderer.
   * Returns a cleanup function to remove the listener.
   *
   * @param {string} channel
   * @param {(...args: any[]) => void} callback
   * @returns {() => void} unsubscribe function
   */
  on: (channel, callback) => {
    if (!ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
      console.warn(`[Preload] Blocked listener on unknown channel: "${channel}"`);
      return () => {};
    }

    // Wrap callback to strip the Event object (security best practice)
    const listener = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, listener);

    // Return unsubscribe function for use in React useEffect cleanup
    return () => ipcRenderer.removeListener(channel, listener);
  },

  /**
   * Expose read-only environment info to the renderer.
   */
  env: {
    isDev: process.env.NODE_ENV === 'development',
    platform: process.platform,
    backendUrl: 'http://localhost:3000',
    aiServiceUrl: 'http://localhost:8000',
  },
});
