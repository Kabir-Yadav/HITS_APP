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
      cors: {
        origin: ['https://accounts.google.com', 'https://apis.google.com', 'https://www.googleapis.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.googleapis.com; frame-src 'self' https://accounts.google.com https://apis.google.com; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://oauth2.googleapis.com https://apis.google.com; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
      }
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
