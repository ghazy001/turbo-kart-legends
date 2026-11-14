import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { phonePlugin, phoneHttps } from './server/phonePlugin.ts';

export default defineConfig({
  plugins: [react(), phonePlugin()],
  server: { fs: { deny: ['.env', '.env.*', '**/.git/**', '**/.certs/**', '*.{crt,pem}'] }, https: phoneHttps(), host: process.env.TKL_PHONE_LAN ? '0.0.0.0' : '127.0.0.1' },
  preview: { https: phoneHttps(), host: process.env.TKL_PHONE_LAN ? '0.0.0.0' : '127.0.0.1' },
  build: {
    rolldownOptions: { output: { codeSplitting: { groups: [
      { name: 'three-core', test: /three[\\/]build[\\/]three.core.js/, priority: 40 },
      { name: 'three-renderer', test: /node_modules[\\/]three[\\/]/, priority: 30 },
      { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
      { name: 'fiber', test: /node_modules[\\/]@react-three[\\/]/, priority: 10 },
    ] } } },
  },
});
