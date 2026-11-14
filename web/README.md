# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Testing

Component tests use [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com/react). Config lives in `vitest.config.ts` (merged into `vite.config.ts`, not a separate toolchain) and `src/test/setup.ts` (jest-dom matchers + per-test cleanup).

```bash
npm run test        # run once, exits with a code — what CI should use
npm run test:watch  # watch mode for local development
```

Test files live next to the component they test (`Component.tsx` + `Component.test.tsx`), same folder — see `src/components/ThemeToggle/ThemeToggle.test.tsx` for the pattern: render inside the real Context providers a component depends on, assert against user-visible behavior (accessible name, `localStorage`, DOM attributes) rather than internal state.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
