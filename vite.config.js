import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import eslintPlugin from 'vite-plugin-eslint';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      eslintPlugin({
        include: ['src/**/*.js', 'src/**/*.jsx'],
      }),
    ],
    resolve: {
      alias: {
        src: resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 8000,
      strictPort: true,
      cors: true,
    },
    build: {
      minify: false, 
      sourcemap: true, 
      chunkSizeWarningLimit: 1500, 
    },
    define: {
      'process.env': env,
    },
  };
});
