<div align="center">

# 🌊 Realtime Wave Observer

**Ứng dụng Desktop quan sát và phân tích sóng biển theo thời gian thực**

[![Node.js](https://img.shields.io/badge/Node.js-≥20.0-339933?logo=node.js)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-≥3.10-3776AB?logo=python)](https://python.org)
[![Electron](https://img.shields.io/badge/Electron-v43-47848F?logo=electron)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-≥0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![pnpm](https://img.shields.io/badge/pnpm-Monorepo-F69220?logo=pnpm)](https://pnpm.io)
[![License](https://img.shields.io/badge/License-Private-red)](.)

</div>

---

## Update logs

- 23/07/2026: Version beta 0.0.0.0: Thuần init, sửa lỗi init, code chỉ mang tính minh họa

- 23/07/2026: Version beta 0.0.0.1: Thêm husky pre-commit,...

---

## 📋 Mục Lục

- [Giới Thiệu](#-giới-thiệu)
- [Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
- [Yêu Cầu Môi Trường](#-yêu-cầu-môi-trường)
- [Cài Đặt & Khởi Chạy](#-cài-đặt--khởi-chạy)
- [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)
- [Quy Chuẩn Phát Triển](#-quy-chuẩn-phát-triển)
- [Biến Môi Trường](#-biến-môi-trường)
- [Quy Trình Build & Đóng Gói](#-quy-trình-build--đóng-gói)

---

## 🌊 Giới Thiệu

**Realtime Wave Observer** là ứng dụng desktop đa nền tảng (ưu tiên Windows) phục vụ công tác **thu thập, trực quan hóa và phân tích dữ liệu sóng biển** trong các chiến dịch thử nghiệm ngoài khơi. Ứng dụng hoạt động hoàn toàn **offline**, xử lý dữ liệu tại chỗ (on-device) mà không cần kết nối internet.

### Tính Năng Cốt Lõi

| Tính năng                              | Mô tả                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| 📡 **Thu thập dữ liệu thời gian thực** | Nhận dữ liệu từ cảm biến tần số 10 Hz qua giao thức serial/USB                     |
| 📊 **Dashboard trực quan**             | Biểu đồ sóng live, phổ tần số (FFT), và các thông số hải dương học                 |
| 🤖 **Phân tích AI**                    | Mô hình PyTorch dự đoán phân loại sóng và cảnh báo ngưỡng nguy hiểm                |
| 💾 **Lưu trữ cục bộ**                  | SQLite (metadata phiên đo) + CSV (dữ liệu thô)                                     |
| 🔒 **Bảo mật**                         | Kiến trúc Electron Context Bridge — renderer process cách ly hoàn toàn với Node.js |

---

## 🏗️ Kiến Trúc Hệ Thống

Ứng dụng được xây dựng theo kiến trúc **Monorepo** với 4 thành phần độc lập, giao tiếp qua HTTP/WebSocket nội bộ:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ELECTRON SHELL                           │
│                    (electron/main.js)                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              BrowserWindow (Chromium)                    │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │           FRONTEND — React 19 / Vite               │  │   │
│  │  │                                                    │  │   │
│  │  │   Zustand Store ──► Recharts Dashboard             │  │   │
│  │  │         │                    │                     │  │   │
│  │  │         ▼                    ▼                     │  │   │
│  │  │   socket.io-client    REST API calls               │  │   │
│  │  └────────────┬───────────────────┬───────────────────┘  │   │
│  │               │  ws://localhost   │  http://localhost    │   │
│  │               │  :3000            │  :3000               │   │
│  └───────────────┼───────────────────┼──────────────────────┘   │
│                  │                   │                          │
│  ┌───────────────┼───────────────────┼──────────────────────┐   │
│  │               ▼                   ▼                      │   │
│  │          BACKEND — Node.js / Express v5 / Socket.IO      │   │
│  │                   (backend/server.js)                    │   │
│  │                                                          │   │
│  │   Socket.IO Server ──► Sensor Data Ingestion             │   │
│  │   REST API     ──────► SQLite + CSV Storage              │   │
│  │   Proxy /predict ────► http://127.0.0.1:8000             │   │
│  └─────────────────────────────┬────────────────────────────┘   │
│                                │  http://127.0.0.1:8000         │
│  ┌─────────────────────────────┼────────────────────────────┐   │
│  │                             ▼                            │   │
│  │        AI SERVICE — Python / FastAPI / PyTorch           │   │
│  │                   (ai_service/main.py)                   │   │
│  │                                                          │   │
│  │   POST /predict  ──► PyTorch Model Inference             │   │
│  │   POST /process  ──► SciPy Signal Processing (FFT)       │   │
│  │   GET  /health   ──► Service health check                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              DATA STORAGE (Local)                         │  │
│  │  data_storage/metadata.db       ← SQLite (phiên đo)       │  │
│  │  data_storage/raw_waves/*.csv   ← Dữ liệu thô sóng        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Giao Tiếp Giữa Các Dịch Vụ

| Kênh                            | Từ            | Đến        | Giao thức             | Mô tả                        |
| ------------------------------- | ------------- | ---------- | --------------------- | ---------------------------- |
| `ws://localhost:3000`           | Frontend      | Backend    | WebSocket (Socket.IO) | Luồng dữ liệu sóng 10 Hz     |
| `http://localhost:3000/api/*`   | Frontend      | Backend    | REST HTTP             | Truy vấn dữ liệu, cấu hình   |
| `http://127.0.0.1:8000/predict` | Backend       | AI Service | REST HTTP             | Yêu cầu inference mô hình AI |
| `http://127.0.0.1:8000/process` | Backend       | AI Service | REST HTTP             | Xử lý tín hiệu FFT           |
| `ipcMain ↔ ipcRenderer`         | Electron Main | Renderer   | Electron IPC          | Điều khiển cửa sổ, cập nhật  |

---

## 🛠️ Yêu Cầu Môi Trường

### Phần Mềm Bắt Buộc

| Phần mềm    | Phiên bản tối thiểu | Ghi chú                      |
| ----------- | ------------------- | ---------------------------- |
| **Node.js** | `>= 20.0.0` (LTS)   | Kiểm tra: `node --version`   |
| **pnpm**    | `>= 9.0.0`          | Cài: `npm install -g pnpm`   |
| **Python**  | `>= 3.10`           | Kiểm tra: `python --version` |
| **Git**     | `>= 2.40`           |                              |

### Phần Mềm Khuyến Nghị (Development)

| Công cụ         | Mục đích                                          |
| --------------- | ------------------------------------------------- |
| **VS Code**     | IDE chính thức của dự án (`.vscode/` đã cấu hình) |
| **Ruff**        | Python linter/formatter (`pip install ruff`)      |
| **Python venv** | Quản lý môi trường Python độc lập                 |

### Phần Cứng

- RAM: Tối thiểu **8 GB** (PyTorch CPU inference cần ~2 GB)
- CPU: Tối thiểu **4 cores** để chạy đồng thời 3 dịch vụ
- Cổng USB: Kết nối cảm biến sóng (phụ thuộc phần cứng thực tế)

---

## 🚀 Cài Đặt & Khởi Chạy

### Bước 1 — Clone & Cài Đặt Dependencies

```bash
# Clone repository
git clone <repository-url>
cd Realtime-Wave-Observe-Web

# Cài tất cả JS/TS dependencies (frontend + backend + root)
pnpm install
```

### Bước 2 — Thiết Lập Python Virtual Environment

```bash
# Tạo virtual environment cho AI Service
cd ai_service
python -m venv .venv

# Kích hoạt (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Kích hoạt (Windows CMD)
.\.venv\Scripts\activate.bat

# Cài Python dependencies
pip install -r requirements.txt

# Quay lại thư mục gốc
cd ..
```

### Bước 3 — Cấu Hình Biến Môi Trường

```bash
# Backend — copy và chỉnh sửa nếu cần
copy backend\.env.example backend\.env

# AI Service — copy và chỉnh sửa nếu cần
copy ai_service\.env.sample ai_service\.env
```

> **Lưu ý:** Với cấu hình mặc định (localhost, port chuẩn), bạn không cần chỉnh sửa gì thêm.

### Bước 4 — Khởi Chạy Môi Trường Phát Triển

```bash
# Khởi động toàn bộ hệ thống (Frontend + Backend + AI Service + Electron)
pnpm dev
```

Lệnh trên sẽ khởi động song song:

| Service                            | URL                     | Màu log    |
| ---------------------------------- | ----------------------- | ---------- |
| **Frontend** (Vite dev server)     | `http://localhost:5173` | 🔵 Cyan    |
| **Backend** (Express + Socket.IO)  | `http://localhost:3000` | 🟢 Green   |
| **AI Service** (FastAPI + Uvicorn) | `http://localhost:8000` | 🟡 Yellow  |
| **Electron**                       | Cửa sổ desktop          | 🟣 Magenta |

### Khởi Chạy Từng Dịch Vụ Riêng Lẻ

```bash
pnpm dev:fe        # Chỉ Frontend (Vite)
pnpm dev:be        # Chỉ Backend (nodemon)
pnpm dev:ai        # Chỉ AI Service (uvicorn --reload)
pnpm dev:electron  # Chỉ Electron shell
```

---

## 📁 Cấu Trúc Thư Mục

```
Realtime-Wave-Observe-Web/
│
├── 📦 package.json              # Root workspace config (scripts, electron-builder)
├── 📄 pnpm-workspace.yaml       # pnpm Monorepo packages declaration
├── 🐳 docker-compose.yml        # Docker setup cho backend + AI service
├── 🔒 .gitignore                # Loại trừ: node_modules, .venv, .env, model weights, raw data
│
├── ⚛️  frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── components/          # UI components (charts, panels, controls)
│   │   ├── stores/              # Zustand state management
│   │   ├── types/               # TypeScript type definitions (wave.ts, api.ts)
│   │   ├── hooks/               # Custom React hooks
│   │   └── pages/               # Page-level components
│   ├── vite.config.ts
│   ├── tsconfig.app.json
│   └── package.json
│
├── 🟢 backend/                   # Node.js ESM + Express v5 + Socket.IO
│   ├── server.js                # Main entry point
│   ├── routes/                  # Express route handlers
│   ├── controllers/             # Business logic
│   ├── models/                  # SQLite data models (better-sqlite3)
│   ├── config/                  # App configuration
│   ├── database/                # SQLite connection & migrations
│   ├── .env                     # ⚠️ KHÔNG commit
│   ├── .env.example             # Template biến môi trường
│   └── package.json
│
├── 🐍 ai_service/                # Python 3.10+ + FastAPI + PyTorch
│   ├── main.py                  # FastAPI app, endpoints, lifespan
│   ├── models/                  # Thư mục chứa model weights (.pt) — git-ignored
│   ├── processing/              # Signal processing modules
│   ├── pyproject.toml           # Cấu hình Ruff + pytest
│   ├── requirements.txt         # Production dependencies
│   ├── requirements-dev.txt     # Dev dependencies (pytest, httpx, ruff)
│   ├── .venv/                   # ⚠️ KHÔNG commit
│   └── .env                     # ⚠️ KHÔNG commit
│
├── ⚡ electron/                  # Electron Main + Preload processes
│   ├── main.js                  # Main process: BrowserWindow, child process management
│   ├── preload.js               # Context Bridge: whitelist IPC API cho renderer
│   └── assets/                  # App icon (.ico, .png)
│
├── 💾 data_storage/              # Lưu trữ dữ liệu local — git-ignored
│   ├── metadata.db              # SQLite: phiên đo, cấu hình sensor
│   └── raw_waves/               # CSV: dữ liệu sóng thô từng phiên
│
└── 🤖 .agents/                   # AI Agent Rules (Antigravity/Cursor/etc.)
    └── SKILL.md                 # Rules: coding guidelines, security, performance
```

---

## 📐 Quy Chuẩn Phát Triển

### JavaScript / TypeScript (Frontend + Backend)

- **Module system:** Bắt buộc dùng ES Modules (`import`/`export`). **Tuyệt đối không dùng** `require()`.
- **TypeScript:** Strict mode bật tại frontend. Tất cả hàm phải có type annotation đầy đủ.
- **Linting:** ESLint (flat config) — chạy tự động trên pre-commit hook.
- **Formatting:** Prettier — frontend và backend đều tuân thủ.

#### Chạy Lint & Format

```bash
# Lint toàn bộ frontend
pnpm --filter frontend lint

# Lint + fix backend
pnpm --filter backend lint:fix

# Format backend
pnpm --filter backend format
```

#### Cấu Hình ESLint (Backend)

Backend dùng `eslint-plugin-prettier/recommended` — ESLint chạy Prettier như một rule:

```javascript
// backend/eslint.config.js
import prettierPlugin from "eslint-plugin-prettier/recommended";
// Prettier config tại backend/.prettierrc
```

### Python (AI Service)

- **Style:** PEP 8, enforced bởi **Ruff**.
- **Type hints:** Bắt buộc cho tất cả function signatures.
- **Docstrings:** Google-style docstrings cho public functions.

#### Chạy Ruff

```bash
cd ai_service

# Kiểm tra lỗi
ruff check .

# Auto-fix
ruff check --fix .

# Format code
ruff format .
```

### Quy Tắc Git

| Loại           | Prefix     | Ví dụ                                             |
| -------------- | ---------- | ------------------------------------------------- |
| Tính năng mới  | `feat`     | `feat(backend): add wave ingestion endpoint`      |
| Sửa lỗi        | `fix`      | `fix(electron): resolve waitForPort async bug`    |
| Chore / Config | `chore`    | `chore(root): update pnpm to v9.5`                |
| Tài liệu       | `docs`     | `docs: update README installation guide`          |
| Test           | `test`     | `test(ai_service): add FFT processing unit tests` |
| Refactor       | `refactor` | `refactor(frontend): extract chart component`     |

**Branch naming:** `feat/sensor-ingestion`, `fix/electron-ipc-leak`, `chore/upgrade-react-19`

### Bảo Mật Electron

- `contextIsolation: true` + `nodeIntegration: false` — **Bắt buộc, không thay đổi.**
- Mọi IPC channel phải được whitelist tại `electron/preload.js`.
- `shell.openExternal()` chỉ accept URL bắt đầu bằng `https://`.

---

## 🔧 Biến Môi Trường

### Backend (`backend/.env`)

```env
# Server
PORT=3000
NODE_ENV=development

# Frontend origin (cho CORS whitelist)
FRONTEND_ORIGIN=http://localhost:5173

# AI Microservice URL
AI_SERVICE_URL=http://127.0.0.1:8000
```

### AI Service (`ai_service/.env`)

```env
# FastAPI Server
API_HOST=127.0.0.1
API_PORT=8000
ENVIRONMENT=development

# Model weights path
MODEL_PATH=./models/wave_model_cpu.pt
```

> ⚠️ **Quan trọng:** File `.env` đã được thêm vào `.gitignore`. Không bao giờ commit file `.env` thật lên repository.

---

## 📦 Quy Trình Build & Đóng Gói

### Build Frontend

```bash
pnpm run build:fe
# Output: frontend/dist/
```

### Build AI Service (PyInstaller)

```bash
# Kích hoạt venv trước
cd ai_service && .\.venv\Scripts\Activate.ps1

pnpm run build:ai
# Output: ai_service/dist/ai_engine.exe (~500 MB, CPU-only PyTorch)
```

### Build Electron Installer (Windows NSIS)

```bash
# Bắt buộc chạy build:fe và build:ai trước
pnpm run build:electron
# Output: dist-electron/*.exe (NSIS installer)
```

> **Lưu ý:** `electron-builder` sẽ đóng gói `frontend/dist/`, `backend/`, và `ai_service/dist/ai_engine.exe` thành một installer duy nhất.

### Kiểm Tra Nhanh (Health Check)

```bash
# Backend
curl http://localhost:3000/api/health

# AI Service
curl http://localhost:8000/health
```

---

## 👥 Nhóm Phát Triển

| Thành viên       | Vai trò                               |
| ---------------- | ------------------------------------- |
| _(Team Lead)_    | Kiến trúc hệ thống, Electron, Backend |
| _(Frontend Dev)_ | React, Dashboard, Recharts            |
| _(AI Engineer)_  | PyTorch model, Signal Processing      |

---

<div align="center">

**© 2026 CompuMat — Dự án nội bộ. Không phân phối.**

_Realtime Wave Observer — Giai đoạn 1 hoàn tất ✅_

</div>
