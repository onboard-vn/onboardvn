import { defineConfig } from 'vitest/config';
import { testEnv } from './src/test/global-setup.js';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globalSetup: ['./src/test/global-setup.ts'],
    env: testEnv(),
    fileParallelism: false,
  },
});
