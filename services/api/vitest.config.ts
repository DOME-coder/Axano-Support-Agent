import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Decorator-heavy NestJS code compiles via the TS path, but
    // Vitest with esbuild does fine for these unit-/lightweight
    // tests. Heavy DB-touching e2e tests live behind an explicit
    // tag and will get their own runner later.
  },
  esbuild: {
    target: 'es2022',
  },
});
