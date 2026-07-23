import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React Compiler natively via @vitejs/plugin-react v6
      // React Compiler tự động optimize re-renders, thay thế useMemo/useCallback thủ công
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}],
        ],
      },
    }),
    tailwindcss(),
  ],
})
