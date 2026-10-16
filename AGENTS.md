তুমি আমার AutoHub প্রজেক্টে কাজ করছ (Next.js App Router, TypeScript, Prisma, PostgreSQL, Redis, BullMQ)। নিচের নিয়মগুলো সব কাজে মানবে:

1. আমি একবারে একটা ধাপ দেব। শুধু সেই ধাপের কাজ করবে, অন্য কিছু পরিবর্তন করবে না।
2. কোড লেখার আগে প্ল্যান দেখাও (কোন ফাইল বানাবে/বদলাবে, কোন Prisma model যোগ হবে)। আমি approve করলে তারপর কোড লিখবে।
3. নতুন কোনো UI library (shadcn, MUI ইত্যাদি) যোগ করবে না। বিদ্যমান custom design system (.glass, .btn, .badge, .input, dark/light theme) ব্যবহার করবে এবং reusable কম্পোনেন্ট বানাবে।
4. Database পরিবর্তন শুধু Prisma migration দিয়ে হবে, আগের ডেটা যেন নষ্ট না হয়।
5. প্রতিটা admin API route ও Server Action-এ server-side permission check থাকতেই হবে। শুধু UI লুকিয়ে রাখলে হবে না।
6. প্রতিটা query-তে pagination, দরকারি index ও শুধু প্রয়োজনীয় field select থাকবে। পুরো table একসাথে আনবে না।
7. প্রতিটা পেজে loading, empty ও error state থাকবে।
8. কাজ শেষে জানাবে: কী বানালে, কোন ফাইল বদলালো, আমি কীভাবে ধাপে ধাপে test করব, আর npm run build ও type check পাস করেছে কি না। তারপর থেমে আমার অনুমতির অপেক্ষা করবে।
9. কিছু অস্পষ্ট হলে অনুমান না করে আমাকে একটা প্রশ্ন করবে।

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
