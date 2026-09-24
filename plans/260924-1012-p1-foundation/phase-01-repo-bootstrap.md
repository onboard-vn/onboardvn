---
phase: 1
title: "Repo & governance bootstrap"
status: completed
priority: P1
effort: "2d"
dependencies: []
---

# Phase 1: Repo & governance bootstrap

## Overview
Tạo GitHub org, monorepo pnpm + Turborepo rỗng chạy được, license và tài liệu đóng góp.

## Requirements
- Functional: org `onboard-vn` (user tự tạo trên GitHub), repo `onboard`, `dataset`, `.github`.
- Non-functional: Node 22 LTS, pnpm, TypeScript strict, ESLint + Prettier, Vitest, GitHub Actions.

## Architecture
```
onboard/
├── apps/web  apps/api  (apps/mobile: README placeholder)
├── packages/shared  packages/config (tsconfig, eslint preset)
├── docker-compose.yml   (postgres:16)
├── turbo.json  pnpm-workspace.yaml  .nvmrc
├── LICENSE (AGPL-3.0)  README.md  CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md
└── docs/ (architecture.md, references.md)
```

## Related Code Files
- Create: toàn bộ khung trên; `.github/workflows/ci.yml`; `.env.example` từng app.

## Implementation Steps
1. User tạo org `onboard-vn` + 3 repo (hướng dẫn trong README; agent không tạo org).
2. `pnpm init`, workspace, turbo pipeline `lint/typecheck/test/build/dev`.
3. `packages/config`: tsconfig base, eslint flat config.
4. Scaffold `apps/web` (create-next-app), `apps/api` (Hono node-server), `packages/shared` (zod).
5. `docker-compose.yml` Postgres 16, port cố định 54329 tránh đụng laradock.
6. LICENSE AGPL-3.0 nguyên văn; CONTRIBUTING (DCO sign-off, conventional commits, quy trình PR, tiếng Việt + tóm tắt EN); Contributor Covenant 2.1.
7. CI: install → lint → typecheck → test → build, cache pnpm.
8. `docs/references.md`: ghi nguồn Board Game Wikia, ShelfScan, GameUPC, BGG.

## Success Criteria
- [ ] `pnpm dev` mở web :3000 + api :8787 (health `GET /health` 200).
- [ ] CI xanh trên PR đầu tiên.
- [ ] LICENSE, CONTRIBUTING, CoC, SECURITY có mặt.

## Risk Assessment
- DCO vs CLA: chọn DCO (nhẹ, không cần ký giấy). Nếu sau muốn đổi license → khó; ghi rõ trong CONTRIBUTING.
- Port đụng laradock → dùng port cố định riêng, ghi README.
