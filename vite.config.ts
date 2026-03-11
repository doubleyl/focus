import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
        electron([
            {
                entry: 'electron/main.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['electron', 'electron-store']
                        }
                    },
                    resolve: {
                        alias: {
                            '@shared': path.resolve(__dirname, 'shared')
                        }
                    }
                }
            },
            {
                entry: 'electron/preload.ts',
                onstart(options) {
                    options.reload()
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['electron']
                        }
                    }
                }
            }
        ]),
        electronRenderer()
    ],
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, 'shared')
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                overlay: path.resolve(__dirname, 'overlay.html'),
                break: path.resolve(__dirname, 'break.html'),
                quick: path.resolve(__dirname, 'quick.html')
            }
        }
    }
})
