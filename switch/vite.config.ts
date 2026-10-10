import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
    resolve: {
        alias: {
            '@game': fileURLToPath(new URL('../src/js', import.meta.url)),
        },
    },
    build: {
        target: 'es2022',
        outDir: 'romfs',
        emptyOutDir: false,
        lib: {
            entry: 'src/main.ts',
            formats: ['es'],
            fileName: () => 'main.js',
        },
    },
})
