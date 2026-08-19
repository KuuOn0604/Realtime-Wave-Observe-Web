# Git Workflow — Realtime Wave Observer

Tài liệu này bổ sung cho `RULES.md`.

`RULES.md` quy định coding conventions, Conventional Commits và prefix của branch.
Tài liệu này chỉ mô tả **mô hình nhánh, quy trình Pull Request và cách phối hợp giữa các thành viên**.

---

## 1. Mô hình nhánh

Dự án sử dụng ba tầng nhánh chính.

| Nhánh                                                      | Vai trò                                                            | Quyền push trực tiếp |
| ---------------------------------------------------------- | ------------------------------------------------------------------ | -------------------- |
| `main`                                                     | Phiên bản ổn định, dùng cho các milestone/release đã được kiểm tra | Không                |
| `develop`                                                  | Nhánh tích hợp chung của toàn bộ team                              | Không                |
| `feat/...`, `fix/...`, `docs/...`, `test/...`, `chore/...` | Nhánh thực hiện từng đầu việc                                      | Người phụ trách task |

Luồng tổng quát:

```text
task branch
     │
     │ Pull Request
     ▼
  develop
     │
     │ kiểm tra milestone
     ▼
    main
```

Không tạo task branch trực tiếp từ `main`.

---

## 2. Quy trình bắt đầu một task

Trước khi bắt đầu công việc mới:

```bash
git checkout develop
git pull origin develop
```

Sau đó tạo branch từ `develop`.

Ví dụ:

```bash
git checkout -b feat/mai-01-loader
```

Trong quá trình làm việc:

```bash
git add .
git commit -m "feat(ai_service): add CSV loader"
git push -u origin feat/mai-01-loader
```

Khi hoàn thành:

1. Push branch lên GitHub.
2. Tạo Pull Request.
3. Target của Pull Request là `develop`.
4. Cần ít nhất 1 thành viên khác review.
5. Chỉ merge khi không còn blocker quan trọng.
6. Sau khi merge thành công có thể xoá task branch.

---

## 3. Quy tắc đặt tên branch

Cấu trúc ưu tiên:

```text
[type]/[owner]-[task-number]-[short-description]
```

Ví dụ:

```text
feat/mai-01-loader
feat/an-01-mock-emitter
feat/minh-01-validate
feat/lak-01-dashboard
```

Các prefix tuân theo `RULES.md`:

```text
feat/
fix/
docs/
test/
chore/
```

Đối với lỗi hoặc công việc phát sinh ngoài bảng phân công, không bắt buộc có số task.

Ví dụ:

```text
fix/an-socket-timeout
docs/minh-update-data-contract
chore/lak-update-dependencies
```

---

## 4. Branch theo đầu việc hiện tại

### Mai — Signal Processing & AI

| Task               | Branch                         |
| ------------------ | ------------------------------ |
| CSV loader         | `feat/mai-01-loader`           |
| Signal filters     | `feat/mai-02-filters`          |
| Windowing          | `feat/mai-03-windowing`        |
| Feature extraction | `feat/mai-04-features`         |
| Dataset pipeline   | `feat/mai-05-dataset-pipeline` |
| Model training     | `feat/mai-06-train-model`      |
| Training report    | `docs/mai-07-training-report`  |
| Predictor          | `feat/mai-08-predictor`        |
| Debug plot         | `feat/mai-09-debug-plot`       |

Tên model cụ thể có thể thay đổi sau khi nhóm thống nhất baseline và kiến trúc mô hình.

---

### Ân — Backend & System Integration

| Task                   | Branch                          |
| ---------------------- | ------------------------------- |
| Mock sensor/emitter    | `feat/an-01-mock-emitter`       |
| Backend data ingestion | `feat/an-02-sensor-ingest`      |
| Prediction endpoint    | `feat/an-03-predict-endpoint`   |
| Session storage        | `feat/an-04-session-controller` |
| AI service integration | `feat/an-05-ai-service-wiring`  |
| End-to-end testing     | `test/an-06-e2e`                |

---

### Minh — Data & Infrastructure

| Task                      | Branch                           |
| ------------------------- | -------------------------------- |
| Input data validator      | `feat/minh-01-validate`          |
| SQLite schema             | `feat/minh-02-schema`            |
| Seed script               | `feat/minh-03-seed`              |
| Git workflow              | `docs/minh-04-git-workflow`      |
| Dataset/model changelog   | `docs/minh-05-changelog`         |
| Logging                   | `feat/minh-06-logger`            |
| Dataset integrity checker | `feat/minh-07-dataset-integrity` |
| Backup                    | `feat/minh-08-backup`            |

---

### LAK — Frontend & Visualization

| Task               | Branch                         |
| ------------------ | ------------------------------ |
| Dashboard          | `feat/lak-01-dashboard`        |
| Wave chart         | `feat/lak-02-wave-chart`       |
| Wave store         | `feat/lak-03-wave-store`       |
| Socket integration | `feat/lak-04-use-socket`       |
| Prediction panel   | `feat/lak-05-prediction-panel` |

---

## 5. Pull Request và Review

Mỗi Pull Request cần mô tả tối thiểu:

```text
Task:
Owner:

What changed:
-

How to test:
-

Dependencies / affected modules:
-

Known issues:
-
```

### Quy tắc review

Một Pull Request cần tối thiểu 1 approval.

Nếu PR thay đổi interface giữa hai module, người sở hữu module liên quan nên là reviewer.

Ví dụ:

| Thay đổi                     | Reviewer ưu tiên |
| ---------------------------- | ---------------- |
| AI data format               | Mai + Minh       |
| Backend ↔ AI API             | Ân + Mai         |
| Backend ↔ Frontend Socket.IO | Ân + LAK         |
| Database/session metadata    | Minh + Ân        |

---

## 6. Ownership và chỉnh sửa chéo

Một thành viên có thể cần sửa file thuộc module của thành viên khác để tích hợp hệ thống.

Trong trường hợp đó:

1. Không tự thay đổi interface đã thống nhất mà không báo owner.
2. Ghi rõ thay đổi trong Pull Request.
3. Yêu cầu owner của module review trước khi merge.

Ví dụ:

* `ai_service/main.py`: Ân phụ trách wiring/integration, Mai phụ trách AI logic.
* Backend session storage: Ân phụ trách controller, Minh phụ trách schema/database convention.
* Socket payload: Ân và LAK phải thống nhất trước khi triển khai hai phía.

---

## 7. Merge `develop` vào `main`

`develop` chỉ merge vào `main` khi đạt một milestone đã được nhóm thống nhất và phiên bản trên `develop` hoạt động ổn định.

Quy trình:

```text
develop
   │
   │ Pull Request + review
   ▼
 main
```

Không merge `develop` vào `main` chỉ vì một task riêng lẻ đã hoàn thành.

Versioning tuân theo quy chuẩn version hiện hành của repository trong `RULES.md` và `.agents/SKILL.md`.

Tài liệu Git Workflow không định nghĩa một chuẩn version riêng.

---

## 8. Branch Protection

Khuyến nghị cấu hình GitHub cho:

### `main`

* Require a pull request before merging.
* Không push trực tiếp.
* Require approval trước khi merge.

### `develop`

* Require a pull request before merging.
* Không push trực tiếp.
* Require tối thiểu 1 approval.

Các rule này cần người có quyền quản trị repository cấu hình.

---

## 9. Husky và pre-commit

Repository đã có `.husky/pre-commit`.

Trước khi bổ sung thêm hook, cần kiểm tra nội dung hiện tại:

```bash
cat .husky/pre-commit
```

và:

```bash
cat package.json
```

Pre-commit hook hiện có cần được giữ tương thích với cấu hình ESLint, Prettier và các script hiện tại của repository.

Conventional Commit hiện được xem là quy ước bắt buộc theo `RULES.md`.

Chỉ bổ sung `commitlint` nếu cả nhóm thống nhất cần enforce commit message tự động.

---

## 10. Nguyên tắc chung

* Không push trực tiếp lên `main`.
* Không push trực tiếp lên `develop`.
* Mỗi branch ưu tiên chỉ giải quyết một task.
* Không đưa nhiều thay đổi không liên quan vào cùng một Pull Request.
* Pull Request cần nhỏ và dễ review.
* Không tự thay đổi contract giữa các module mà chưa thống nhất với owner liên quan.
* Commit message tuân theo `RULES.md`.
* Không commit `.env`, raw dataset, model weights hoặc secret.
