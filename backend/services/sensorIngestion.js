/**
 * backend/services/sensorIngestion.js
 * Sensor Data Ingestion Service — Realtime Wave Observer
 *
 * Chịu trách nhiệm đọc dữ liệu thô từ cảm biến sóng (phao đo) qua cổng Serial,
 * parse dữ liệu NMEA/custom binary, và gọi emitWaveData() để push lên Socket.IO.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE — Hai chế độ hoạt động:
 *
 *  [DEV MODE]  → MockSensorReader:  Sinh dữ liệu sóng ngẫu nhiên với mô hình
 *                                   sóng sin + nhiễu Gaussian để kiểm tra UI.
 *
 *  [PROD MODE] → RealSensorReader:  Đọc từ SerialPort thực, parse NMEA sentence
 *                                   hoặc binary frame theo giao thức của phần cứng.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CÁC BƯỚC ĐỂ KẾT NỐI PHẦN CỨNG THỰC (điền vào trước Phase 3):
 *  1. Xác định COM port của phao (ví dụ: COM3 trên Windows)
 *  2. Cấu hình baudRate phù hợp (thường 9600 hoặc 115200 cho NMEA)
 *  3. Chọn parser: ReadlineParser (NMEA text) hoặc ByteLengthParser (binary frame)
 *  4. Implement parseFrame() theo đúng giao thức phần cứng
 *  5. Đặt SENSOR_PORT và SENSOR_BAUD_RATE trong backend/.env
 */

import { EventEmitter } from 'events';

// ─── Hằng số cấu hình ─────────────────────────────────────────────────────
const MOCK_SAMPLE_RATE_HZ = 10;          // 10 Hz → interval 100ms
const MOCK_INTERVAL_MS    = 1000 / MOCK_SAMPLE_RATE_HZ;
const MOCK_SENSOR_ID      = 'sensor_mock_01';

// ─────────────────────────────────────────────────────────────────────────────
//  MOCK SENSOR READER (Development / Testing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MockSensorReader — Giả lập cảm biến sóng biển.
 *
 * Mô hình vật lý:
 *  - Sóng chính (dominant wave): sin với biên độ 1.2m, chu kỳ 8s
 *  - Sóng phụ (secondary swell): sin với biên độ 0.4m, chu kỳ 4s
 *  - Nhiễu trắng (sensor noise): Gaussian μ=0, σ=0.05m
 *
 * Điều này cho ra dữ liệu thực tế hơn random thuần túy,
 * giúp test FFT và Welch PSD trên AI Service cho kết quả có ý nghĩa.
 *
 * @fires MockSensorReader#data  Phát ra mỗi sample: { sensorId, timestamp, value, unit }
 * @fires MockSensorReader#error Phát ra nếu có lỗi internal
 */
class MockSensorReader extends EventEmitter {
  #intervalId = null;
  #startTime  = Date.now();
  #sensorId;

  constructor(sensorId = MOCK_SENSOR_ID) {
    super();
    this.#sensorId = sensorId;
  }

  /**
   * Bắt đầu phát dữ liệu mock ở tần số MOCK_SAMPLE_RATE_HZ.
   */
  start() {
    if (this.#intervalId) return; // Đã chạy rồi, bỏ qua

    console.log(`[SensorIngestion] 🎭 Mock sensor "${this.#sensorId}" started (${MOCK_SAMPLE_RATE_HZ} Hz)`);

    this.#intervalId = setInterval(() => {
      const sample = this.#generateSample();
      this.emit('data', sample);
    }, MOCK_INTERVAL_MS);
  }

  /**
   * Dừng phát dữ liệu và giải phóng interval.
   */
  stop() {
    if (!this.#intervalId) return;
    clearInterval(this.#intervalId);
    this.#intervalId = null;
    console.log(`[SensorIngestion] 🛑 Mock sensor "${this.#sensorId}" stopped`);
  }

  /**
   * Sinh một data point sóng biển mô phỏng.
   * @returns {{ sensorId: string, timestamp: number, value: number, unit: string }}
   */
  #generateSample() {
    const elapsedSec = (Date.now() - this.#startTime) / 1000;

    // Mô hình sóng: dominant + secondary swell + white noise
    const dominant  = 1.2 * Math.sin((2 * Math.PI * elapsedSec) / 8.0);
    const swell     = 0.4 * Math.sin((2 * Math.PI * elapsedSec) / 4.0);
    const noise     = this.#gaussianNoise(0, 0.05);

    const waveHeight = dominant + swell + noise;

    return {
      sensorId : this.#sensorId,
      timestamp: Date.now(),
      value    : parseFloat(waveHeight.toFixed(4)), // Làm tròn 4 chữ số thập phân
      unit     : 'm',
    };
  }

  /**
   * Box-Muller transform để sinh số theo phân phối chuẩn N(μ, σ).
   * @param {number} mu    Giá trị trung bình
   * @param {number} sigma Độ lệch chuẩn
   * @returns {number}
   */
  #gaussianNoise(mu, sigma) {
    const u1 = 1 - Math.random(); // Tránh log(0)
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mu + sigma * z0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  REAL SENSOR READER (Production — điền giao thức phần cứng thực tế vào đây)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RealSensorReader — Đọc dữ liệu từ cảm biến phần cứng qua SerialPort.
 *
 * TODO (Hardware Team): Điền vào các phần được đánh dấu TODO bên dưới
 * trước khi kết nối phần cứng thực.
 *
 * @fires RealSensorReader#data  { sensorId, timestamp, value, unit }
 * @fires RealSensorReader#error  Error object
 * @fires RealSensorReader#close  Khi port đóng bất ngờ
 */
class RealSensorReader extends EventEmitter {
  #port    = null;
  #parser  = null;
  #portPath;
  #baudRate;
  #sensorId;

  /**
   * @param {object} config
   * @param {string} config.portPath  COM port (ví dụ: 'COM3' hoặc '/dev/ttyUSB0')
   * @param {number} config.baudRate  Tốc độ baud (ví dụ: 9600, 115200)
   * @param {string} config.sensorId  Định danh cảm biến
   */
  constructor({ portPath, baudRate = 9600, sensorId = 'sensor_01' } = {}) {
    super();
    this.#portPath  = portPath;
    this.#baudRate  = baudRate;
    this.#sensorId  = sensorId;
  }

  /**
   * Mở SerialPort và bắt đầu lắng nghe dữ liệu.
   *
   * Đây là async vì SerialPort.open() là async.
   * Gọi hàm này từ server.js sau khi Express/Socket.IO đã khởi động.
   */
  async start() {
    // Dynamic import để tránh crash khi serialport chưa được build
    const { SerialPort } = await import('serialport');
    const { ReadlineParser } = await import('@serialport/parser-readline');

    this.#port = new SerialPort({
      path    : this.#portPath,
      baudRate: this.#baudRate,
      autoOpen: false,
    });

    // TODO: Chọn parser phù hợp với giao thức phần cứng:
    //  - ReadlineParser: cho dữ liệu text kết thúc bằng '\n' (NMEA, ASCII CSV)
    //  - ByteLengthParser: cho binary frame có độ dài cố định
    //  - InterByteTimeoutParser: cho binary frame với timeout giữa các byte
    this.#parser = this.#port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    // Lắng nghe dữ liệu từ parser
    this.#parser.on('data', (line) => {
      try {
        const parsed = this.#parseFrame(line);
        if (parsed !== null) {
          this.emit('data', { sensorId: this.#sensorId, ...parsed });
        }
      } catch (err) {
        this.emit('error', new Error(`[RealSensor] Parse error: ${err.message}`));
      }
    });

    this.#port.on('error', (err) => this.emit('error', err));
    this.#port.on('close', ()    => this.emit('close'));

    // Mở port
    await new Promise((resolve, reject) => {
      this.#port.open((err) => (err ? reject(err) : resolve()));
    });

    console.log(`[SensorIngestion] 📡 Real sensor connected: ${this.#portPath} @ ${this.#baudRate} baud`);
  }

  /**
   * Đóng SerialPort gracefully.
   */
  async stop() {
    if (!this.#port?.isOpen) return;
    await new Promise((resolve) => this.#port.close(resolve));
    console.log(`[SensorIngestion] 📴 Real sensor disconnected: ${this.#portPath}`);
  }

  /**
   * TODO (Hardware Team): Implement theo giao thức phần cứng thực tế.
   *
   * Ví dụ — NMEA sentence dạng: "$WVHT,1.234,M*XX"
   *   const parts = line.split(',');
   *   if (parts[0] !== '$WVHT') return null;
   *   return { timestamp: Date.now(), value: parseFloat(parts[1]), unit: parts[2] };
   *
   * Ví dụ — ASCII CSV: "1234567890,1.234"
   *   const [ts, val] = line.split(',');
   *   return { timestamp: parseInt(ts), value: parseFloat(val), unit: 'm' };
   *
   * @param {string} rawFrame  Dữ liệu thô từ parser
   * @returns {{ timestamp: number, value: number, unit: string } | null}
   */
  #parseFrame(rawFrame) {
    // TODO: Thay thế placeholder này bằng logic parse thực tế
    console.warn('[RealSensor] parseFrame() chưa được implement:', rawFrame);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  FACTORY — Chọn reader theo NODE_ENV
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tạo SensorReader phù hợp theo môi trường.
 *
 * - development/test → MockSensorReader (không cần phần cứng)
 * - production       → RealSensorReader (đọc từ COM port thực)
 *
 * @param {Function} emitWaveData  Callback từ server.js để push data lên Socket.IO
 * @returns {{ start: Function, stop: Function }}
 */
export function createSensorIngestion(emitWaveData) {
  const isProduction = process.env.NODE_ENV === 'production';

  let reader;

  if (isProduction) {
    const portPath  = process.env.SENSOR_PORT;
    const baudRate  = Number(process.env.SENSOR_BAUD_RATE) || 9600;
    const sensorId  = process.env.SENSOR_ID || 'sensor_01';

    if (!portPath) {
      throw new Error('[SensorIngestion] SENSOR_PORT không được cấu hình trong .env!');
    }

    reader = new RealSensorReader({ portPath, baudRate, sensorId });
    console.log(`[SensorIngestion] Chế độ PRODUCTION → SerialPort ${portPath}`);
  } else {
    reader = new MockSensorReader();
    console.log('[SensorIngestion] Chế độ DEVELOPMENT → Mock Sensor Data');
  }

  // Wire: khi reader phát ra 'data', forward lên Socket.IO qua emitWaveData()
  reader.on('data', (dataPoint) => {
    emitWaveData(dataPoint.sensorId, {
      timestamp: dataPoint.timestamp,
      value    : dataPoint.value,
      unit     : dataPoint.unit,
    });
  });

  reader.on('error', (err) => {
    console.error('[SensorIngestion] Sensor error:', err.message);
  });

  return {
    start: () => reader.start(),
    stop : () => reader.stop(),
  };
}
