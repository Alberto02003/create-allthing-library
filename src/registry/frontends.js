/**
 * Frontend registry.
 *
 * Each entry:
 *   id      – internal identifier used by scaffold / generators
 *   label   – human-readable name shown in prompts
 *
 * To add a new frontend:
 *   1. Add a template directory under  templates/frontend/<id>/
 *   2. Add a runner in                 src/runners/<id>.js
 *   3. Register it here.
 */
export const frontends = [
  {
    id: 'react-vite',
    label: 'React (Vite)',
  },
];
