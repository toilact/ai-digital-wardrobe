# =========================
# base
# =========================
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
EXPOSE 3000

# =========================
# build
# =========================
FROM node:20-alpine AS build
WORKDIR /src

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  else npm i; fi

COPY . .
RUN npm run build

# =========================
# publish
# =========================
FROM build AS publish
RUN mkdir -p /app/publish && \
    cp -r package.json /app/publish/ && \
    cp -r node_modules /app/publish/ && \
    cp -r .next /app/publish/ && \
    if [ -d public ]; then cp -r public /app/publish/; fi

# =========================
# final
# =========================
FROM base AS final
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=publish /app/publish .

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]