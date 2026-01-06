---
paths: components/**/*.tsx
---

# Component Rules

- Use functional components with TypeScript
- Define prop interfaces above component definition
- Use Tailwind CSS for styling - avoid custom CSS
- Include loading and error states where applicable
- Keep components under 300 lines; extract logic to custom hooks if needed
- Use `'use client'` directive only when necessary (event handlers, hooks, browser APIs)
- Prefer composition over prop drilling
- Add JSDoc comments for complex props
