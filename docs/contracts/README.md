# System Contracts — Realtime Wave Observer

Thư mục này quản lý các **interface giữa các module** trong Realtime Wave Observer.

Mục tiêu là tránh trường hợp hai thành viên triển khai hai phía của cùng một luồng dữ liệu nhưng sử dụng format khác nhau.

---

## 1. Nguyên tắc

Contract phải được thống nhất trước khi hai module phụ thuộc trực tiếp vào nhau.

Một contract có:

* một owner chính;
* ít nhất một collaborator ở module phía còn lại;
* trạng thái;
* cấu trúc dữ liệu/interface đã thống nhất.

Các trạng thái:

```text
TBD       Chưa đủ thông tin để chốt
DRAFT     Đang thảo luận
APPROVED  Hai phía đã thống nhất
CHANGED   Contract cần cập nhật
```

Không xem implementation placeholder hiện tại là contract chính thức nếu chưa được các thành viên liên quan xác nhận.

---

## 2. Raw Data Contract

**Owner:** Mai
**Collaborator:** Minh
**Status:** TBD

Contract này mô tả dữ liệu đầu vào dùng cho signal processing và AI.

Cần thống nhất:

* định dạng CSV/raw stream;
* metadata đầu file;
* timestamp;
* sample rate;
* đơn vị tín hiệu;
* số lượng channel;
* tên các field;
* giá trị thiếu hoặc invalid;
* cách xác định experiment/session;
* cách lưu label/ground truth.

### Practice dataset hiện tại

Nhóm đang có dữ liệu CSV thử nghiệm dùng để:

* học đọc dữ liệu;
* thử filtering;
* windowing;
* FFT/feature extraction;
* xây dựng pipeline;
* thử nghiệm model baseline.

Practice dataset **không được xem là format cuối cùng của dữ liệu phao thực tế**.

---

## 3. Sensor → Backend Contract

**Owner:** Ân
**Collaborator:** TBD theo hardware interface
**Status:** TBD

Code hiện tại trong:

```text
backend/services/sensorIngestion.js
```

có MockSensorReader và RealSensorReader phục vụ development.

Các giá trị như:

```text
10 Hz
SerialPort
NMEA / ASCII CSV
9600 baud
unit = metres
```

hiện được xem là **development placeholder**, chưa phải specification chính thức của phần cứng.

Contract thật cần được cập nhật sau khi bên phần cứng xác nhận:

* connection type;
* baud rate nếu dùng Serial;
* frame format;
* timestamp source;
* sample rate;
* sensor channels;
* voltage/data units;
* error handling.

---

## 4. Backend → AI Service Contract

**Owner:** Ân
**Collaborator:** Mai
**Status:** DRAFT / TBD

Code hiện tại:

```text
ai_service/main.py
```

đã có các endpoint placeholder:

```text
GET  /health
POST /process
POST /predict
```

Các schema hiện tại được sử dụng để prototype integration.

Trước khi AI pipeline chính thức được nối vào backend, Mai và Ân cần thống nhất:

* request payload;
* batch/window size;
* sample rate representation;
* input unit;
* preprocessing nằm ở backend hay AI service;
* prediction label;
* confidence;
* error format;
* model/version metadata.

---

## 5. Backend → Frontend Socket Contract

**Owner:** Ân
**Collaborator:** LAK
**Status:** TBD

Cần thống nhất:

* tên Socket.IO event;
* payload từng sample;
* payload batch/window;
* prediction event;
* sensor status event;
* connection/disconnection state;
* error event.

Ví dụ hiện tại trong backend chỉ được xem là placeholder cho development.

---

## 6. Database / Session Metadata Contract

**Owner:** Minh
**Collaborator:** Ân
**Status:** TBD

Contract này xác định thông tin về một measurement session được lưu trong SQLite.

Raw waveform không mặc định lưu trực tiếp thành từng row trong SQLite.

Hướng hiện tại:

```text
SQLite
→ metadata / session information

CSV / file storage
→ raw waveform
```

Các field chính sẽ được chốt sau khi xác nhận Data Contract và cách `sessionController` lưu phiên đo.

Có thể bao gồm:

```text
session_id
started_at
ended_at
experiment_type
location
raw_file_path
sample_rate
sensor_id
label
notes
```

Danh sách trên chưa phải schema cuối cùng.

---

## 7. Nguyên tắc thay đổi Contract

Khi một contract đã ở trạng thái `APPROVED`:

1. Không thay đổi âm thầm trong code.
2. Thảo luận với collaborator/module liên quan.
3. Cập nhật tài liệu contract.
4. Sau đó mới cập nhật implementation ở hai phía.
5. Pull Request phải ghi rõ đây là breaking change hay compatible change.

---

## 8. Các contract dự kiến tách thành file riêng

Khi đủ thông tin, thư mục này sẽ được mở rộng thành:

```text
docs/contracts/
├── README.md
├── RAW_DATA.md
├── SENSOR_STREAM.md
├── AI_API.md
├── SOCKET_EVENTS.md
└── SESSION_METADATA.md
```

Không cần tạo các file riêng trước khi contract tương ứng đủ thông tin để mô tả.
