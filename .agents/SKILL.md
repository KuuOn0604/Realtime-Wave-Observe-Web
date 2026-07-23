# Realtime Wave Observer - AI Agent Rules

## 1. Project Context
- **Name:** Realtime Wave Observer
- **Type:** Desktop Application for Offshore Field Testing.
- **Architecture:** Monorepo (pnpm workspace) bundling Frontend (React), Backend (Express/Socket.io), and AI Service (FastAPI) into an Electron wrapper.

## 2. Tech Stack & Execution
- **Package Manager:** pnpm
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Zustand.
- **Backend:** Node.js (ESM), Express v5, Socket.io, better-sqlite3.
- **AI Service:** Python (FastAPI), PyTorch (CPU-only), NumPy, SciPy.
- **Desktop:** Electron v43 (electron-builder).

## 3. Coding Guidelines
- **Language:** Default response language is Vietnamese (per user preferences).
- **TypeScript/JavaScript:** Strictly use ES Modules (`import`/`export`). No `require()`.
- **Python:** Adhere to PEP 8, enforced by `ruff`. Use type hints for ALL function signatures.
- **Real-time Data:** Prioritize performance for high-frequency data streams. Use efficient data structures and prevent memory leaks in Socket.io and Recharts.

## 4. Workflows
- **Running locally:** `pnpm dev` runs all microservices concurrently.
- **Testing:** Frontend/Backend uses `vitest`, AI Service uses `pytest`.

## 5. Electron Security & IPC (Context Bridge)
- **Whitelist Only:** Mọi channel IPC PHẢI được khai báo trong `ALLOWED_SEND_CHANNELS` hoặc `ALLOWED_RECEIVE_CHANNELS` tại `electron/preload.js`. Không bao giờ expose channel động.
- **Không dùng `send/on` cho request-response:** Ưu tiên `ipcRenderer.invoke()` + `ipcMain.handle()` để tránh listener accumulation và có async error handling đúng cách.
- **`shell.openExternal` phải validate URL:** Chỉ cho phép `https://` scheme. Từ chối `javascript:`, `file:`, `data:`.
  ```javascript
  // ✅ Đúng
  if (url.startsWith('https://')) shell.openExternal(url);
  ```
- **`sandbox: false` là tạm thời:** Chỉ giữ khi preload thực sự cần Node built-ins. Mục tiêu cuối: `sandbox: true`.
- **Không để `nodeIntegration: true`** dù trong bất kỳ hoàn cảnh nào.
- **CSP Headers:** Phải cấu hình Content-Security-Policy trong `main.js` để restrict script-src, connect-src.

## 6. Socket.IO Data Stream Management
- **Volatile emit cho non-critical data:** Dùng `socket.volatile.emit('wave:data', ...)` cho live chart data — bỏ qua nếu client bận thay vì queue.
- **`socket.emit()` (reliable) cho critical data:** Cảnh báo ngưỡng sóng cao, trạng thái sensor.
- **Buffer limit:** Đặt `maxHttpBufferSize: 1e6` (1 MB) trong Socket.IO Server config.
- **Room cleanup:** Trong `disconnect` handler, kiểm tra và rời khỏi tất cả rooms của socket.
- **Rate limiting:** `subscribe:sensor` event phải giới hạn tối đa 1 lần/giây/socket.
- **Frontend throttle:** Recharts chỉ nên re-render tối đa 30fps. Dùng `useCallback` + `throttle` để giảm tần suất `setState`.
- **Sliding window:** Zustand store chỉ giữ tối đa `MAX_DATA_POINTS = 1000` điểm dữ liệu mới nhất. Khi vượt quá, dùng `Array.slice(-MAX_DATA_POINTS)`.

## 7. Memory Leak Prevention
### React / Frontend
- Mọi `socket.on(event, handler)` trong `useEffect` **PHẢI** return `() => socket.off(event, handler)`.
- Mọi `window.electronAPI.on(channel, cb)` **PHẢI** gọi unsubscribe function khi unmount.
- Không lưu raw wave array lớn vào Zustand — chỉ lưu aggregated/windowed data.
- Dùng `useRef` cho timers/intervals, clear trong cleanup.

### Node.js Backend
- Mọi call đến AI Service **PHẢI** dùng `AbortController` với timeout 30 giây.
- Không thêm listener trên `io` object bên trong `connection` handler (tránh accumulate mỗi connect).
- Đặt `--max-old-space-size=512` cho production Node process.
- SQLite: Luôn `close()` statement sau khi dùng xong (better-sqlite3 sync API).

### Python AI Service
- Wrap PyTorch inference trong `torch.no_grad()`.
- Không lưu numpy arrays ở global scope giữa các request — chỉ xử lý trong function scope.
- FastAPI: Dùng `async def` cho endpoints I/O-bound, `def` cho endpoints CPU-bound (chạy trong threadpool tự động).

## 8. Data Contract & API Schema
- TypeScript types cho wave data **PHẢI** được định nghĩa tại `frontend/src/types/wave.ts` và đồng bộ với Pydantic schemas trong `ai_service/main.py`.
- Mọi Socket.IO event phải có TypeScript interface tương ứng.
- Backend REST API phải trả về consistent JSON error format: `{ "error": string, "detail": string }`.

## 9. Git & Commit Convention
- **Branch:** `feat/`, `fix/`, `chore/`, `docs/`, `test/` prefix.
- **Commit:** Conventional Commits: `feat(backend): add sensor subscription endpoint`.
- **Scope:** `frontend`, `backend`, `ai_service`, `electron`, `root`.
- **Không commit:** `.env`, model weights (`.pt`, `.pth`), raw CSV data, `node_modules/`, `.venv/`.