# Monorepo Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tái cấu trúc dự án phẳng (Next `src/` + `ai-service/`) thành monorepo pnpm + Turborepo (`apps/web`, `services/ai`, `packages/shared`), giữ nguyên hành vi.

**Architecture:** Giữ Next full-stack trong `apps/web`. `ai-service` đổi thành `services/ai` (Python, wrapper package.json để Turbo điều phối). `packages/shared` (@adw/shared) chứa domain logic thuần, khởi đầu là `vip.ts`. Chỉ di chuyển + sửa path/import/config — KHÔNG đổi logic.

**Tech Stack:** pnpm workspaces, Turborepo, Next.js 16, FastAPI (Python 3.11 venv qua uv).

## Global Constraints

- Behavior-preserving: chỉ move + sửa path/import/config; không refactor logic, không xóa code chết.
- Giữ working baseline hiện tại (các fix upload chưa commit) — không được làm mất.
- Mỗi task kết thúc bằng verify chạy được + 1 commit. Làm trên nhánh `refactor/monorepo`, KHÔNG commit thẳng `main`.
- pnpm dùng `.npmrc` với `node-linker=hoisted` (firebase/sharp native).
- Path alias `@/*` vẫn trỏ `apps/web/src/*`. Web import vip qua `@adw/shared`.
- Verify lặp lại smoke test Goal 1: ai `/health` `sam_ready:true`; web `GET /`→200; login→tách đồ→lưu tủ OK.

---

### Task 0: Preflight — baseline sạch + nhánh riêng

**Files:** (không tạo file; thao tác git)

- [ ] **Step 1: Xem các thay đổi chưa commit**

Run: `git status --short && git diff --stat`
Expected: thấy M ở `ai-service/app.py`, `package.json`, `package-lock.json`, `src/app/api/wardrobe/confirm/route.ts`, `src/components/WardrobeUploader.tsx`; `??` ở `docs/`.

- [ ] **Step 2: Tạo nhánh làm việc**

```bash
git checkout -b refactor/monorepo
```

- [ ] **Step 3: Commit baseline đang chạy (các fix upload + sharp) + spec/plan**

```bash
git add ai-service/app.py package.json package-lock.json \
  src/app/api/wardrobe/confirm/route.ts src/components/WardrobeUploader.tsx docs/
git commit -m "chore: snapshot working baseline (upload fixes, sharp) before monorepo restructure

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 4: Xác nhận tree sạch**

Run: `git status --short`
Expected: rỗng (không còn file dirty).

---

### Task 1: Scaffold pnpm workspace + move Next → apps/web

**Files:**
- Move: toàn bộ Next (`src/`, `public/`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `package.json`, `Dockerfile`, `.env.local`, `.env.local.example`) → `apps/web/`
- Create: `package.json` (root), `pnpm-workspace.yaml`, `.npmrc`, `turbo.json`
- Delete: `package-lock.json` (chuyển sang pnpm)
- Modify: `apps/web/next.config.ts`, `apps/web/package.json`

- [ ] **Step 1: Tạo thư mục và di chuyển app Next bằng git mv**

```bash
mkdir -p apps/web
git mv src public next.config.ts tsconfig.json eslint.config.mjs postcss.config.mjs tailwind.config.ts package.json Dockerfile apps/web/
git mv .env.local apps/web/.env.local
git mv .env.local.example apps/web/.env.local.example
```

- [ ] **Step 2: Xóa lockfile npm (chuyển pnpm)**

```bash
git rm package-lock.json
```

- [ ] **Step 3: Tạo `pnpm-workspace.yaml` (root)**

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
```

- [ ] **Step 4: Tạo `.npmrc` (root)**

```
node-linker=hoisted
```

- [ ] **Step 5: Tạo `turbo.json` (root)**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**"] },
    "lint": {},
    "start": { "cache": false, "persistent": true }
  }
}
```

- [ ] **Step 6: Tạo `package.json` (root)**

```json
{
  "name": "ai-digital-wardrobe",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.3.3"
  }
}
```

- [ ] **Step 7: Đặt tên cho `apps/web/package.json`**

Modify `apps/web/package.json`: đổi `"name": "ai-digital-wardrobe"` → `"name": "web"`. Giữ nguyên mọi deps/scripts/allowScripts.

- [ ] **Step 8: Cho Next transpile workspace package**

Modify `apps/web/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@adw/shared"],
};

export default nextConfig;
```

- [ ] **Step 9: Cài lại bằng pnpm**

Run: `pnpm install`
Expected: tạo `pnpm-lock.yaml`, không lỗi resolve native (firebase/sharp).

- [ ] **Step 10: Verify web chạy + build**

```bash
pnpm --filter web dev   # rồi ở terminal khác:
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # mong đợi 200
```
Dừng dev, rồi: `pnpm --filter web lint` (pass), `pnpm --filter web build` (pass).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: move Next app to apps/web, set up pnpm+turbo workspace

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Move ai-service → services/ai + wrapper package.json

**Files:**
- Move: `ai-service/` → `services/ai/`
- Create: `services/ai/package.json`
- Modify: `apps/web/.env.local` ai-service URL nếu cần (giữ `AI_SERVICE_URL=http://127.0.0.1:8000`)

- [ ] **Step 1: Di chuyển service**

```bash
mkdir -p services
git mv ai-service services/ai
```

- [ ] **Step 2: Tạo wrapper `services/ai/package.json`**

```json
{
  "name": "ai-service",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "SAM_CHECKPOINT=\"$PWD/checkpoints/mobile_sam.pt\" ENABLE_SAM=1 ./.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000",
    "start": "SAM_CHECKPOINT=\"$PWD/checkpoints/mobile_sam.pt\" ENABLE_SAM=1 ./.venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8000"
  }
}
```

- [ ] **Step 3: Cập nhật workspace nhận diện service**

Run: `pnpm install`
Expected: `services/ai` xuất hiện trong workspace (pnpm-lock cập nhật, không cài deps JS cho nó).

- [ ] **Step 4: Verify ai-service vẫn chạy sau khi move**

```bash
cd services/ai && SAM_CHECKPOINT="$PWD/checkpoints/mobile_sam.pt" ENABLE_SAM=1 \
  ./.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000 &
sleep 8 && curl -s http://127.0.0.1:8000/health
```
Expected: `{"ok":true,...,"sam_ready":true,...}`.
**Nếu venv lỗi sau khi move** (shebang path tuyệt đối): tạo lại venv —
```bash
cd services/ai && rm -rf .venv && uv venv --python 3.11 .venv
uv pip install torch==2.2.2 torchvision==0.17.2
grep -vE '^\s*(--extra-index-url|torch==|torchvision==)' requirements.txt > /tmp/reqs_mac.txt
VIRTUAL_ENV="$PWD/.venv" uv pip install -r /tmp/reqs_mac.txt
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move ai-service to services/ai with turbo wrapper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Tạo packages/shared (@adw/shared) + rewire import vip

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`
- Move: `apps/web/src/lib/vip.ts` → `packages/shared/src/vip.ts`
- Modify (đổi import `@/lib/vip` → `@adw/shared`): `apps/web/src/app/api/wardrobe/confirm/route.ts`, `apps/web/src/app/api/vip/order/route.ts`, `apps/web/src/app/api/vip/admin/approve/route.ts`, `apps/web/src/app/api/vip/admin/list/route.ts`, `apps/web/src/app/api/vip/create-order/route.ts`, `apps/web/src/app/api/outfit-suggest/route.ts`, `apps/web/src/lib/profile.ts`
- Modify: `apps/web/package.json` (thêm dep `@adw/shared`)

**Interfaces:**
- Produces: package `@adw/shared` export toàn bộ API hiện có của `vip.ts` (`VIP_PLAN_CODE`, `VIP_PRICE`, `VIP_DURATION_DAYS`, `PaymentMethod`, `VipOrderStatus`, `buildVipOrderCode`, `addDays`, `toDateSafe`, `hasActiveVip`).

- [ ] **Step 1: Tạo `packages/shared/package.json`**

```json
{
  "name": "@adw/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

- [ ] **Step 2: Tạo `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Di chuyển vip.ts**

```bash
mkdir -p packages/shared/src
git mv apps/web/src/lib/vip.ts packages/shared/src/vip.ts
```

- [ ] **Step 4: Tạo `packages/shared/src/index.ts`**

```ts
export * from "./vip";
```

- [ ] **Step 5: Thêm dep workspace vào `apps/web/package.json`**

Modify `apps/web/package.json` dependencies: thêm `"@adw/shared": "workspace:*"`.

- [ ] **Step 6: Đổi import ở 7 file**

Ở mỗi file liệt kê trên, đổi:
```ts
import { ... } from "@/lib/vip";
```
thành:
```ts
import { ... } from "@adw/shared";
```
(giữ nguyên danh sách symbol được import trong từng file.)

- [ ] **Step 7: Cài lại + typecheck/build**

```bash
pnpm install
pnpm --filter web lint
pnpm --filter web build
```
Expected: pass, không còn tham chiếu `@/lib/vip`.

- [ ] **Step 8: Verify smoke (luồng dùng vip)**

```bash
pnpm --filter web dev   # terminal khác: curl 200; đăng nhập + lưu tủ (route confirm dùng hasActiveVip) chạy bình thường
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: extract vip logic to @adw/shared package

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Cập nhật Docker / compose / gitignore / README cho cấu trúc mới

**Files:**
- Modify: `docker-compose.yml`, `.gitignore`, `services/ai/.dockerignore`, `README.md`
- Modify: `apps/web/Dockerfile` (build trong context monorepo, pnpm)
- Create: `.dockerignore` (root)

- [ ] **Step 1: Cập nhật `docker-compose.yml`**

Đổi 2 build context + volume path:
```yaml
services:
  ai-service:
    build:
      context: ./services/ai
      dockerfile: Dockerfile
    # ... (giữ nguyên environment)
    volumes:
      - ./services/ai/checkpoints:/app/checkpoints
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    env_file:
      - apps/web/.env.local
    # ... (giữ nguyên environment, depends_on)
```

- [ ] **Step 2: Viết lại `apps/web/Dockerfile` cho pnpm monorepo (Next standalone)**

```dockerfile
FROM node:20-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY services/ai/package.json services/ai/package.json
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
RUN pnpm --filter web build

FROM base AS final
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 3: Tạo `.dockerignore` (root)**

```
.git
node_modules
**/node_modules
apps/web/.next
services/ai/.venv
services/ai/checkpoints
**/__pycache__
```

- [ ] **Step 4: Cập nhật `.gitignore` (root) cho path mới**

Sửa các dòng path Python về `services/ai/`:
```
services/ai/.venv/
services/ai/checkpoints/
```
(giữ các mục khác; `.env*` và `*.pt/.pth` vẫn áp dụng toàn repo.)

- [ ] **Step 5: Cập nhật README**

Sửa mục cấu trúc + lệnh chạy local sang: `pnpm install`, `pnpm --filter web dev`, lệnh uvicorn trong `services/ai`. Sửa path checkpoint `services/ai/checkpoints/mobile_sam.pt`.

- [ ] **Step 6: Verify (tùy chọn) Docker build**

```bash
docker compose build
```
Expected: build cả 2 image OK. (Nếu không dùng Docker lúc này có thể bỏ qua, nhưng phải đảm bảo compose path đúng.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: update docker/compose/gitignore/readme for monorepo layout

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Verify end-to-end (toàn bộ smoke test Goal 1)

**Files:** (không sửa; chỉ kiểm chứng)

- [ ] **Step 1: Chạy cả hai qua turbo**

```bash
pnpm install
pnpm dev   # turbo chạy web + ai-service song song
```

- [ ] **Step 2: Kiểm ai-service**

Run: `curl -s http://127.0.0.1:8000/health`
Expected: `"sam_ready":true`.

- [ ] **Step 3: Kiểm web + luồng có auth**

- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200.
- Trên trình duyệt: đăng nhập → upload 1 ảnh → tách đồ → **lưu vào tủ** (Cloudinary + Firestore) chạy y như baseline.

- [ ] **Step 4: Lint + build toàn workspace**

```bash
pnpm build
```
Expected: pass.

- [ ] **Step 5: Commit (nếu có chỉnh nhỏ khi verify)**

```bash
git add -A && git commit -m "test: verify monorepo restructure end-to-end

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" || echo "nothing to commit"
```

---

## Self-Review notes
- Spec coverage: cấu trúc (T1-3), tooling pnpm+turbo (T1), services/ai wrapper (T2), packages/shared chỉ vip.ts (T3), docker/compose/env (T4), verify smoke Goal 1 (T5). Out-of-scope (gộp SDK, xóa code chết...) KHÔNG đụng — đúng spec.
- Baseline fixes chưa commit được bảo toàn ở T0 trước khi move.
- Không placeholder; mọi file config có nội dung thật.
