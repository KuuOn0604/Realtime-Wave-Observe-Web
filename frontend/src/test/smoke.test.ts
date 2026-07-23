/**
 * frontend/src/test/smoke.test.ts
 * Smoke test — Xác nhận rằng môi trường test hoạt động đúng.
 * Đây là test placeholder; thay thế bằng unit tests thực tế khi bắt đầu Phase 2.
 */
import { describe, it, expect } from 'vitest';

describe('Test Environment Smoke Test', () => {
  it('should run vitest correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to jest-dom matchers via setup file', () => {
    // Nếu setup.ts load đúng, @testing-library/jest-dom matchers sẽ available
    const element = document.createElement('div');
    element.textContent = 'Wave Observer';
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Wave Observer');
    document.body.removeChild(element);
  });
});
