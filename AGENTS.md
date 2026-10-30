You are working on my Lead Reach AI project (Next.js App Router, TypeScript, Prisma, PostgreSQL, Redis, BullMQ). Adhere strictly to these rules across all tasks:

1. I will provide one step at a time. Only perform that single step; do not modify anything else.
2. Before writing code, present a plan (which files will be created/modified, which Prisma models will be added). Write code only after I approve.
3. Do not add any new UI libraries (shadcn, MUI, etc.). Use the existing custom design system (.glass, .btn, .badge, .input, dark/light theme) and build reusable components.
4. Database schema changes must only be made via Prisma migrations so existing data is never corrupted or lost.
5. Every admin API route and Server Action must enforce server-side permission checks. Merely hiding UI elements is not sufficient.
6. Every query must implement pagination, appropriate indexes, and select only necessary fields. Never fetch entire tables at once.
7. Every page must implement loading, empty, and error states.
8. Upon completion, report: what was built, which files changed, how to test step by step, and whether npm run build and type checking passed. Then pause and await my approval.
9. If anything is ambiguous, do not assume; ask me a clarifying question.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
