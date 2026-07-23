/**
 * backend/server.js
 * Express + Socket.IO Main Server — Realtime Wave Observer
 *
 * Architecture role:
 *  - HTTP REST API for frontend (data queries, config)
 *  - Socket.IO for realtime wave data push at 10 Hz
 *  - Bridges raw sensor data → SQLite log (metadata) + CSV batches (raw data)
 *  - Proxies AI inference requests to Python FastAPI microservice
 */

import express      from 'express';
import http         from 'http';
import { Server }   from 'socket.io';
import cors         from 'cors';
import dotenv       from 'dotenv';
import { createSensorIngestion } from './services/sensorIngestion.js';

// ─── Load environment variables ────────────────────────────────────────────
dotenv.config();

const PORT        = Number(process.env.PORT)        || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const AI_SERVICE_URL  = process.env.AI_SERVICE_URL  || 'http://127.0.0.1:8000';

// ─── Express App ───────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: [FRONTEND_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));        // Wave batch payloads can be sizeable
app.use(express.urlencoded({ extended: true }));

// ─── HTTP Server (shared between Express and Socket.IO) ───────────────────
const httpServer = http.createServer(app);

// ─── Socket.IO Server ─────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: [FRONTEND_ORIGIN, 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Optimise for high-frequency, low-latency data
  transports: ['websocket'],   // Skip long-polling — we need true WebSocket speed
  pingInterval: 10_000,
  pingTimeout:  5_000,
});

// ─── Socket.IO Connection Handler ─────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected   — id=${socket.id}`);

  // Client subscribes to a specific sensor stream
  socket.on('subscribe:sensor', (sensorId) => {
    socket.join(`sensor:${sensorId}`);
    console.log(`[Socket.IO] ${socket.id} subscribed to sensor:${sensorId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected — id=${socket.id} reason=${reason}`);
  });
});

// ─── Helper: broadcast wave data to subscribed clients ────────────────────
/**
 * Emit a wave data packet to all clients subscribed to a sensor room.
 * Called from the data ingestion layer (serial port / sensor driver).
 *
 * @param {string} sensorId
 * @param {{ timestamp: number, value: number, unit: string }} dataPoint
 */
export function emitWaveData(sensorId, dataPoint) {
  io.to(`sensor:${sensorId}`).emit('wave:data', {
    sensorId,
    ...dataPoint,
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'wave-observer-backend',
    timestamp: new Date().toISOString(),
    aiServiceUrl: AI_SERVICE_URL,
  });
});

// ── AI Inference Proxy ────────────────────────────────────────────────────
// Node.js acts as a proxy so the frontend only speaks to one origin.
app.post('/api/predict', async (req, res) => {
  try {
    // Native fetch is available in Node 18+
    const response = await fetch(`${AI_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('[/api/predict] AI service unreachable:', err.message);
    res.status(503).json({
      error: 'AI service unavailable',
      detail: err.message,
    });
  }
});

// ── Signal processing only (no AI model) ─────────────────────────────────
app.post('/api/process', async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (err) {
    console.error('[/api/process] AI service unreachable:', err.message);
    res.status(503).json({ error: 'AI service unavailable', detail: err.message });
  }
});

// ── Placeholder for future routes (Minh — SQLite log queries) ─────────────
// import sessionRoutes from './routes/sessions.js';
// import logRoutes     from './routes/logs.js';
// app.use('/api/sessions', sessionRoutes);
// app.use('/api/logs',     logRoutes);

// ─── 404 Fallback ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Express] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────
// Mảng chứa các cleanup hook (sensor, db connection, v.v.)
// Khai báo trước listen() để tránh TDZ với const
const shutdownHooks = [];

// ─── Start Server ─────────────────────────────────────────────────────────
httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`[Backend] Express + Socket.IO running at http://127.0.0.1:${PORT}`);
  console.log(`[Backend] AI Service URL: ${AI_SERVICE_URL}`);

  // ── Khởi động Sensor Ingestion sau khi server đã sẵn sàng ──────────────
  // Dev mode:  MockSensorReader (sin wave + Gaussian noise)
  // Prod mode: RealSensorReader (SerialPort — cấu hình SENSOR_PORT trong .env)
  const sensor = createSensorIngestion(emitWaveData);
  sensor.start();

  // Đăng ký để cleanup khi shutdown
  shutdownHooks.push(() => sensor.stop());
});

// Electron's taskkill sends SIGTERM/SIGINT — we close the HTTP server cleanly.
const shutdown = (signal) => {
  console.log(`[Backend] Received ${signal} — shutting down gracefully…`);

  // Chạy tất cả cleanup hooks (sensor stop, db close, v.v.)
  for (const hook of shutdownHooks) {
    try { hook(); } catch (e) { console.error('[Backend] Cleanup error:', e); }
  }
  io.close(() => {
    httpServer.close(() => {
      console.log('[Backend] Server closed.');
      process.exit(0);
    });
  });

  // Force-exit if graceful shutdown takes longer than 5 s
  setTimeout(() => process.exit(1), 5_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));