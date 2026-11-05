import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: { output: { codeSplitting: { groups: [
      { name: 'three-core', test: /three[\\/]build[\\/]three.core.js/, priority: 40 },
      { name: 'three-renderer', test: /node_modules[\\/]three[\\/]/, priority: 30 },
      { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
      { name: 'fiber', test: /node_modules[\\/]@react-three[\\/]/, priority: 10 },
    ] } } },
  },
});
