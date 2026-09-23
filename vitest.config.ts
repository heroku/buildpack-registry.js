import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    // Scope test discovery to this package's own test/ dir. The release
    // workflow (heroku/npm-release-workflows) checks its repo out into
    // ./workflows-repo inside the workspace; without this, vitest's default
    // root glob picks up workflows-repo/test/**/*.test.js and fails validate.
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'lcov'],
    },
  },
})
