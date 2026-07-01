import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@domain': '/src/domain',
      '@application': '/src/application',
      '@infrastructure': '/src/infrastructure',
      '@presentation': '/src/presentation',
    },
  },
});
