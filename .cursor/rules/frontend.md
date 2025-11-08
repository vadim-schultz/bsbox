# Frontend Guidelines

## Stack
- Vite + React + TypeScript (ESM modules).
- UI components use Mantine with Tailwind utility classes for layout tweaks.
- Manage async data with React Query; manage local UI state with Zustand slices in `src/services` or `src/store` if added.

## Structure
- `src/containers` for page-level compositions.
- `src/components` for reusable view components (no side effects).
- `src/hooks` for custom logic hooks.
- `src/services` for API clients or gateway logic.
- `src/types` for shared TypeScript types.
- Keep styling tokens and globals inside `src/styles`.

## Patterns
- Containers fetch data via hooks and pass props downward.
- Avoid direct fetch calls in components; route through services.
- Use React Query mutations for stateful operations (POST/PUT).
- Provide accessibility attributes (aria labels) for controls, especially toggle buttons.
- Design for smartphone-first UX: prioritize vertical stacking, touch-friendly controls, and SSE-driven realtime updates.

## Testing & Quality
- Co-locate unit tests beside components (e.g., `__tests__` folders).
- Use Testing Library + Vitest for behavior-driven tests.
- Enforce ESLint, TypeScript `--noEmit`, Prettier formatting via pnpm scripts.

