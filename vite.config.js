import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], optimizeDeps:{include:['fflate']}, worker:{format:'es'}, server:{proxy:{'/api':'http://localhost:8787'}} });
