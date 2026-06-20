# Spec: Tái cấu trúc dự án thành monorepo chuyên nghiệp

- **Ngày:** 2026-06-19
- **Trạng thái:** Đã duyệt thiết kế, chờ review spec
- **Goal nhỏ:** Chỉ tái cấu trúc thư mục (behavior-preserving). KHÔNG dọn logic bên trong.

## Context

AI Digital Wardrobe hiện là 1 app Next.js full-stack (`src/`) + 1 service Python FastAPI tách rời (`ai-service/`), nằm phẳng ở gốc repo. User muốn tổ chức lại thành **monorepo nhiều package** trông giống dự án triển khai thực tế, tách rõ frontend / backend / ai. App đã chạy được end-to-end (Goal 1: login, tách đồ, lưu tủ OK; chỉ phần sinh ảnh outfit chờ vì provider INFIP đã ngừng hoạt động).

**Đã thống nhất khi brainstorm:**
- Kiểu tách: **monorepo nhiều package**, giữ Next full-stack (không tách backend Node riêng).
- Tooling: **pnpm workspaces + Turborepo**.
- Phạm vi goal này: **chỉ di chuyển cấu trúc + sửa path/import/config**, giữ nguyên hành vi. Việc gộp SDK Gemini / làm mỏng route / xóa code chết / tách `app.py` → **goal sau**.

**Ranh giới FE/BE trong kiến trúc này (đã giải thích & user chấp nhận):** Frontend và backend-nghiệp-vụ tách theo **tầng trong cùng app `apps/web`** (Next chặn server code lọt ra browser), không phải 2 service riêng. Service tách rời thật sự là `services/ai` (Python, giao tiếp HTTP). Đây là cách chuẩn cho app Next.js.

## Cấu trúc đích

```
ai-digital-wardrobe/                  ← gốc = pnpm workspace
├── apps/
│   └── web/                          ← toàn bộ Next.js hiện tại
│       ├── src/  public/
│       ├── next.config.ts  tsconfig.json  eslint.config.mjs
│       ├── postcss.config.mjs  tailwind.config.ts
│       ├── .env.local                ← env của web chuyển vào đây
│       ├── Dockerfile                ← Dockerfile web hiện tại, cập nhật cho monorepo
│       └── package.json
├── services/
│   └── ai/                           ← ai-service Python (đổi tên ai-service → services/ai)
│       ├── app.py  networks/  modules/  utils/
│       ├── requirements.txt  Dockerfile  checkpoints/  .venv/
│       ├── .env                      ← env riêng ai-service (SAM_CHECKPOINT, ENABLE_SAM...)
│       └── package.json              ← wrapper mỏng: scripts dev/start gọi uvicorn (để Turbo điều phối)
├── packages/
│   └── shared/                       ← TS dùng chung (@adw/shared)
│       ├── src/index.ts
│       ├── tsconfig.json
│       └── package.json
├── package.json                      ← root: workspace + turbo scripts, packageManager=pnpm
├── pnpm-workspace.yaml
├── turbo.json
├── .npmrc                            ← node-linker=hoisted (an toàn cho firebase/sharp native)
├── docker-compose.yml                ← cập nhật path build context
├── .gitignore                        ← cập nhật path (.venv, checkpoints, .env theo vị trí mới)
└── README.md
```

## Quyết định thiết kế

1. **pnpm + Turborepo.** Xóa `package-lock.json`, tạo `pnpm-lock.yaml`. Root `package.json` đặt `"packageManager": "pnpm@..."`, scripts qua turbo. `turbo.json` định nghĩa task `dev` (persistent), `build`, `lint`. Thêm `.npmrc` với `node-linker=hoisted` để tránh lỗi resolve native module (firebase, sharp) do node_modules strict của pnpm.

2. **`apps/web`** = nguyên app Next hiện tại, chỉ di chuyển. Path alias `@/*` vẫn trỏ trong `apps/web/src` (giữ nguyên tsconfig, chỉ chỉnh baseUrl nếu cần). `.env.local` chuyển vào đây vì Next đọc theo cwd của app.

3. **`services/ai`** = `ai-service` đổi tên. Python KHÔNG phải package pnpm thật; thêm `package.json` wrapper mỏng:
   - `dev`: `SAM_CHECKPOINT=$PWD/checkpoints/mobile_sam.pt ENABLE_SAM=1 ./.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000`
   - để `turbo dev` chạy được cả web + ai cùng lúc. Thành thật: đây là wrapper điều phối, không phải JS package.
   - Env ai-service tách thành `services/ai/.env` (hoặc export trong script), không trộn với env web.

4. **`packages/shared` (@adw/shared, giữ lean).** CHỈ **di chuyển** (không viết lại) module thuần, không phụ thuộc Next/Firebase, đã là file độc lập VÀ đang được dùng:
   - `src/lib/vip.ts` → `packages/shared/src/vip.ts` (logic VIP/ngày thuần, đang được nhiều route import). Đây là ứng viên *sạch* duy nhất hiện tại.
   - Web import qua `@adw/shared` thay cho `@/lib/vip` (cập nhật ~5 chỗ import).
   - **KHÔNG** đưa vào shared: `outfitSchema.ts` (code chết — xử lý ở goal dọn logic), các schema dính logic fetch như trong `labelItem.ts` (không thuần). Các module domain khác sẽ chuyển dần sang shared ở goal dọn logic sau.
   - **Lưu ý:** chỉ web (TS) dùng được shared; ai-service (Python) không xài chung. Shared chủ yếu phục vụ web + thể hiện tách lớp. (Không nhồi cho "đủ" — YAGNI; chấp nhận shared khởi đầu mỏng.)

## Out of scope (để goal sau)

- Gộp 2 SDK Gemini về `@google/genai`; làm mỏng route handlers; tách `lib/services/*`.
- Xóa code chết (`weather.ts`...); gỡ dep `openai`; thêm `sharp` thành dep tường minh.
- Tách `app.py` (~1250 dòng) thành module; thống nhất danh mục category TS↔Python.
- Thêm Vitest, thay provider sinh ảnh outfit (INFIP đã chết).

## Rủi ro

- **pnpm strict node_modules** với firebase/sharp/native → giảm thiểu bằng `.npmrc node-linker=hoisted`.
- **Dockerfile/compose path**: cần sửa build context (root → apps/web, services/ai) và lệnh pnpm install/build có filter.
- **Di chuyển `.venv`**: shebang trong venv dùng path tuyệt đối; gọi qua `./.venv/bin/python -m uvicorn` thì ổn, nhưng nếu lỗi thì tạo lại venv (rẻ, đã có quy trình uv + Python 3.11).
- **Tách `.env`** ra 2 nơi: dễ sót biến → checklist đối chiếu với `.env.local.example`.
- **Diff lớn** (di chuyển nhiều file): kế hoạch sẽ chia bước nhỏ, mỗi bước verify chạy lại được.

## Verification

1. `pnpm install` ở gốc thành công (lockfile mới, không lỗi native resolve).
2. Chạy được (2 cách): `turbo dev` HOẶC chạy riêng `pnpm --filter web dev` + script ai-service.
3. **Lặp lại smoke test Goal 1, phải y như trước:**
   - ai-service `GET /health` → `sam_ready:true`.
   - Web boot, `GET /` → 200.
   - Login → tách đồ → lưu vào tủ (Cloudinary + Firestore) chạy bình thường.
4. `pnpm --filter web lint` và `build` pass.
5. (Tùy chọn) `docker compose up --build` build được với path mới.
