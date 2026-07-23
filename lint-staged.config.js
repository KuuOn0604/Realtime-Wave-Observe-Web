export default {
  // Frontend
  'frontend/**/*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  'frontend/**/*.{css,json,md,html}': ['prettier --write'],
  
  // Backend
  'backend/**/*.js': ['eslint --fix', 'prettier --write'],
  'backend/**/*.json': ['prettier --write'],
  
  // Electron (Đã được bổ sung ESLint)
  'electron/**/*.js': ['eslint --fix', 'prettier --write'],
  'electron/**/*.json': ['prettier --write'],
  
  // AI Service (Python)
  // Sử dụng bash script inline để gọi ruff đảm bảo hoạt động kể cả khi venv chưa được active hoàn toàn, 
  // hoặc mặc định yêu cầu user có ruff trong PATH.
  'ai_service/**/*.py': [
    'ruff check --fix --force-exclude', 
    'ruff format --force-exclude'
  ]
};
