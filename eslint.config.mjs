import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // 'workflows-repo/**' (not '/**/*') so ESLint prunes the directory from
    // traversal. The release workflow injects heroku/npm-release-workflows at
    // ./workflows-repo; under ESLint 10, '/**/*' matches files but doesn't
    // prune the dir, so `eslint .` still descends and imports
    // workflows-repo/eslint.config.js (whose @eslint/js dep isn't installed
    // here), failing the release validate lint step.
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'workflows-repo/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
    },
  },
)
