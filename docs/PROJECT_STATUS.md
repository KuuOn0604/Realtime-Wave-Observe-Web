# Project Status — Realtime Wave Observer

Tài liệu này ghi nhận trạng thái kỹ thuật hiện tại của repository.

Mục đích là phân biệt rõ:

* phần đã được nhóm thống nhất;
* implementation phục vụ prototype/development;
* thông tin đang chờ xác nhận.

Tài liệu này không thay thế `README.md`, `RULES.md` hoặc tài liệu phân công.

---

## 1. Trạng thái hiện tại

**Phase:** Initial Development / Prototype

Hiện tại nhóm KHMT đang ở giai đoạn chuẩn bị pipeline phần mềm và làm quen với dữ liệu trước khi có dataset thử nghiệm chính thức từ phao.

Các module trong repository đã có skeleton/placeholder ban đầu nhưng chưa đại diện cho hệ thống nghiên cứu hoàn chỉnh.

---

## 2. Tech Stack hiện tại

Các công nghệ chính đang được sử dụng theo cấu hình repository:

### Frontend

```text
React 19
TypeScript
Vite
Tailwind CSS 4
Recharts
Zustand
Socket.IO Client
```

### Backend

```text
Node.js
Express
Socket.IO
better-sqlite3
```

### AI Service

```text
Python
FastAPI
NumPy
SciPy
PyTorch
```

Các thư viện ML bổ sung như `scikit-learn` có thể được sử dụng cho baseline model theo kế hoạch AI sau khi nhóm thống nhất.

### Desktop

```text
Electron
```

### Storage

```text
SQLite       → session metadata
CSV / files  → raw waveform
```

---

## 3. Practice Data

Nhóm hiện có một bộ CSV thử nghiệm dùng để học và phát triển pipeline ban đầu.

Mục đích:

```text
CSV loading
→ validation
→ filtering
→ windowing
→ FFT / feature extraction
→ dataset generation
→ baseline model
```

Practice dataset không được xem là đại diện cuối cùng cho dữ liệu phao ngoài thực địa.

Không suy ra protocol phần cứng cuối cùng chỉ từ practice CSV.

---

## 4. Backend Sensor Ingestion

File hiện tại:

```text
backend/services/sensorIngestion.js
```

đã cung cấp:

* `MockSensorReader`;
* skeleton `RealSensorReader`;
* EventEmitter interface;
* development data generation;
* placeholder SerialPort reader.

Các thông tin sau **chưa được xem là final hardware specification**:

```text
10 Hz sample rate
9600 baud
NMEA format
ASCII CSV frame
wave value measured in metres
```

Chúng phục vụ development/mock testing cho tới khi hardware protocol được xác nhận.

---

## 5. AI Service

File hiện tại:

```text
ai_service/main.py
```

đã cung cấp skeleton FastAPI với:

```text
GET /health
POST /process
POST /predict
```

Signal processing và prediction hiện tại phục vụ prototype.

Các assumption như:

```text
sample_rate_hz = 10
samples = wave height in metres
significant wave height
PyTorch inference
```

chưa được xem là final AI/data contract.

Pipeline AI chính thức sẽ được cập nhật sau khi:

1. raw data format được thống nhất;
2. practice dataset được khảo sát;
3. preprocessing pipeline được xây dựng;
4. baseline model được thử nghiệm;
5. dữ liệu phao thực tế được thu thập.

---

## 6. Các thông tin đang chờ xác nhận

### Hardware / Sensor

* sampling rate thực tế;
* protocol truyền dữ liệu;
* USB/Serial/streaming mechanism;
* timestamp source;
* số channel;
* đơn vị của tín hiệu đầu vào;
* dải voltage thực tế;
* cảm biến định hướng nếu có;
* preprocessing đã thực hiện trên mạch.

### AI / Signal Processing

* window size;
* overlap;
* filter parameters;
* feature set;
* baseline model;
* final prediction labels;
* confidence representation.

### Field Experiment

* ground truth;
* labeling convention;
* session metadata;
* synchronization với video;
* format dataset sau thử nghiệm.

---

## 7. Quy tắc khi phát triển trong giai đoạn hiện tại

Không biến assumption trong mock implementation thành specification chính thức.

Nếu một task cần thông tin chưa được xác nhận:

1. đánh dấu `TODO` hoặc `TBD`;
2. tiếp tục bằng mock data nếu có thể;
3. ghi rõ assumption trong code/PR;
4. không hard-code assumption vào nhiều module khác nhau;
5. cập nhật contract khi có thông tin chính thức.

---

## 8. Source of Truth

Thứ tự ưu tiên tài liệu:

```text
RULES.md
→ coding convention / project rules

docs/GIT_WORKFLOW.md
→ branch / Pull Request workflow

docs/contracts/
→ interface giữa các module

PROJECT_STATUS.md
→ trạng thái kỹ thuật hiện tại

README.md
→ giới thiệu, architecture và cách chạy project
```

Nếu implementation hiện tại khác với contract đã được nhóm approve, contract cần được xem xét trước khi tiếp tục integration.
