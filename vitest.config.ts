import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'main',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './renderer/src'),
          },
        },
        test: {
          name: 'renderer',
          environment: 'jsdom',
          globals: true,
          include: ['renderer/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
