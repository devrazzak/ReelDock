import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
    },
    build: {
        outDir: fileURLToPath(new URL('./dist', import.meta.url)),
        emptyOutDir: true,
        target: 'chrome116',
        lib: {
            entry: fileURLToPath(new URL('./harness.ts', import.meta.url)),
            formats: ['iife'],
            name: 'ReelsLiveHarness',
            fileName: () => 'harness.js',
        },
    },
});
