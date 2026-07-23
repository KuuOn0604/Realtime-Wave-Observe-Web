# 📋 Quy Chuẩn Phát Triển & Rules (Realtime Wave Observer)

Tài liệu này tổng hợp cấu trúc thư mục, quy tắc viết code, cấu hình linter/formatter, và các quy ước nhằm đảm bảo tính thống nhất trong dự án dành cho mọi thành viên trong team.

---

## 1. 📁 Cấu Trúc Thư Mục Hệ Thống

Dự án được xây dựng theo kiến trúc **Monorepo** bao gồm 4 thành phần chính: Frontend, Backend, AI Service và Electron.

```text
Realtime-Wave-Observe-Web/
├── ⚛️ frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── components/          # UI components (charts, panels, controls)
│   │   ├── stores/              # Zustand state management
│   │   ├── types/               # TypeScript type definitions (wave.ts, api.ts)
│   │   ├── hooks/               # Custom React hooks
│   │   └── pages/               # Page-level components
│
├── 🟢 backend/                   # Node.js ESM + Express v5 + Socket.IO
│   ├── routes/                  # Express route handlers
│   ├── controllers/             # Business logic
│   ├── models/                  # SQLite data models
│   ├── config/                  # App configuration
│   └── database/                # SQLite connection & migrations
│
├── 🐍 ai_service/                # Python 3.10+ + FastAPI + PyTorch
│   ├── main.py                  # FastAPI app & endpoints
│   ├── models/                  # Nơi chứa model weights (.pt)
│   └── processing/              # Signal processing modules (FFT)
│
├── ⚡ electron/                  # Electron Wrapper
│   ├── main.js                  # Main process: quản lý BrowserWindow và Child Process
│   ├── preload.js               # Context Bridge: IPC API cho renderer
│   └── assets/                  # App icon
│
├── 💾 data_storage/              # Lưu trữ dữ liệu cục bộ (SQLite DB & Raw CSV)
└── 🤖 .agents/                   # Cấu hình AI Agents (Cursor/Antigravity) - SKILL.md
```

---

## 2. 📐 Quy Tắc Code Chung (Coding Guidelines)

### JavaScript / TypeScript (Frontend & Backend)
- **Hệ thống Module:** Bắt buộc sử dụng ES Modules (`import`/`export`). **Tuyệt đối không dùng** `require()`.
- **TypeScript:** Frontend đang bật Strict Mode. Tất cả các hàm phải có type annotation đầy đủ. Các type/interface của Frontend và Backend/AI Service phải đồng bộ.
- **Electron Security:**
  - `contextIsolation: true` và `nodeIntegration: false` là bắt buộc.
  - Các IPC channel **phải** được whitelist trong `preload.js` (qua `ALLOWED_SEND_CHANNELS` hoặc `ALLOWED_RECEIVE_CHANNELS`).
  - Dùng `ipcRenderer.invoke()` + `ipcMain.handle()` cho luồng dữ liệu 2 chiều.
  - Phải xác thực URL khi gọi `shell.openExternal()` (chỉ chấp nhận `https://`).

### Python (AI Service)
- **Style Code:** Tuân thủ chuẩn PEP 8.
- **Type Hints:** Bắt buộc cho tất cả các function signatures để dễ dàng bảo trì.
- **Tối ưu:** Wrap PyTorch inference trong khối `torch.no_grad()`. Không để leak numpy arrays ra global scope.

### Quản Lý State & Tối Ưu (Frontend & Socket)
- Cửa sổ dữ liệu Zustand tối đa: **1000 điểm dữ liệu**.
- Recharts chỉ re-render tối đa **30 fps** (dùng `throttle`).
- Sử dụng `socket.volatile.emit` với các dữ liệu stream (vd: sóng), dùng `emit` thường với các cảnh báo an toàn.
- **Tránh Memory Leak:** Các hàm `useEffect` lắng nghe sự kiện (`socket.on` hay `window.electronAPI.on`) bắt buộc phải trả về hàm cleanup (`socket.off` hoặc tương ứng).

---

## 3. ✨ Quy Tắc Clean Code & Prettier

Dự án sử dụng cấu hình **Prettier** chung cho toàn bộ các package JS/TS (được định nghĩa trong file `.prettierrc` ở mỗi folder):

- `"semi": true` — Bắt buộc có dấu chấm phẩy ở cuối dòng.
- `"singleQuote": true` — Luôn sử dụng nháy đơn `''` thay vì nháy kép `""` cho string.
- `"trailingComma": "es5"` — Thêm dấu phẩy ở cuối các object, array (giúp git diff dễ đọc hơn).
- `"printWidth": 100` — Chiều dài tối đa của một dòng code là 100 ký tự.
- `"tabWidth": 2` — Thụt lề (indentation) bằng 2 spaces.

> 💡 **Tip:** Đã cấu hình cho ESLint tự động báo lỗi nếu bạn format code không đúng với Prettier (`eslint-plugin-prettier/recommended`).

---

## 4. 🔍 Quy Tắc ESLint (Linting Rules)

### ⚛️ Frontend (`frontend/eslint.config.js`)
- Tích hợp chuẩn **TypeScript ESLint** và **React Hooks/Refresh**.
- **`@typescript-eslint/no-unused-vars`**: Báo lỗi (`error`) khi có biến khai báo mà không sử dụng. **Ngoại lệ:** Nếu biến bắt đầu bằng dấu gạch dưới `_` (vd: `_event`, `_props`), sẽ không bị lỗi.
- **`@typescript-eslint/consistent-type-imports`**: Đưa ra cảnh báo (`warn`) nếu import type mà không dùng từ khóa `type` (vd: nên dùng `import type { User } from './types'`).

### 🟢 Backend (`backend/eslint.config.js`)
- Sử dụng ES2024 và môi trường Node.js gốc.
- **`no-console`**: Đưa ra cảnh báo (`warn`) khi sử dụng `console.log()` ở backend. (Khuyến nghị dùng custom logger nếu cần ghi log chi tiết).
- **`no-unused-vars`**: Giống Frontend, báo lỗi khi biến không sử dụng (bỏ qua các biến có tiền tố `_`).

---

## 5. 🏷️ Quy Ước Đặt Tên (Naming Conventions)

### 🌿 Git & Commits
Theo chuẩn **Conventional Commits**:
- **Tính năng mới:** `feat` (vd: `feat(frontend): add wave chart panel`)
- **Sửa lỗi:** `fix` (vd: `fix(backend): fix socket disconnect memory leak`)
- **Cấu hình/Nâng cấp:** `chore` (vd: `chore(root): update eslint to v10`)
- **Tài liệu:** `docs` (vd: `docs: update RULES.md`)
- **Code Refactor:** `refactor` (vd: `refactor(ai_service): optimize FFT transform`)

**Tên Branch:**
Sử dụng cấu trúc `[type]/[feature-name]` (vd: `feat/sensor-integration`, `fix/socket-timeout`).

### 💻 Naming Variables / Functions / Files
- **CamelCase:** Dùng cho biến (Variables), hàm (Functions), instances.
  - Vd: `const waveData = []`, `function calculateFFT() {}`
- **PascalCase:** Dùng cho React Components, Class, TypeScript Types/Interfaces.
  - Vd: `interface WaveConfig {}`, `function WaveChart() {}`
- **UPPER_SNAKE_CASE:** Dùng cho các Hằng số (Constants), Biến môi trường.
  - Vd: `const MAX_DATA_POINTS = 1000`, `PORT=3000`
- **Tên File/Folder:**
  - TypeScript Types, Logic hooks, utils: Kebab-case hoặc CamelCase (tùy chỉnh nhưng nên nhất quán là `kebab-case`). Vd: `use-websocket.ts`, `wave-store.ts`.
  - Component React: PascalCase. Vd: `WaveDashboard.tsx`, `ControlPanel.tsx`.

---
*Vui lòng tham khảo kỹ tài liệu này trước khi tạo Pull Request để duy trì chất lượng Codebase chung!*
