---
paths: app/**/page.tsx, lib/services/**
---

# API Integration Rules

- Define response types in `/types` directory
- Handle errors gracefully with user-friendly feedback
- Use skeleton loaders during data fetching
- Log errors for debugging (avoid exposing sensitive info)
- Use `getManagedToken()` for authenticated requests
- Prefer `Promise.all` for parallel independent requests
- Implement retry logic for transient failures
- Reference `/openapi.json` for API contract details
