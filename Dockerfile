FROM node:24-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV OFFICECLI_SKIP_UPDATE=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ca-certificates libicu72 libssl3 zlib1g libgcc-s1 libstdc++6 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.28.5 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Avoid downloading the OfficeCLI binary twice during dependency installation.
RUN OFFICECLI_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile --prod=false

# The installer places the self-contained binary under the package's vendor directory.
# Keep the image buildable on restricted networks: without the binary, the app still
# generates valid PPTX files and only native animation writing is degraded.
RUN timeout 45s node node_modules/@officecli/officecli/install.js || true \
  && if [ -x /app/node_modules/@officecli/officecli/vendor/officecli ]; then \
       ln -sf /app/node_modules/@officecli/officecli/vendor/officecli /usr/local/bin/officecli; \
       officecli --version || echo "OfficeCLI installed but cannot run; native animations will be disabled."; \
     else \
       echo "OfficeCLI binary unavailable; native animations will be disabled at runtime."; \
     fi

COPY . .
ENV NODE_ENV=production
RUN pnpm exec nuxt prepare \
  && pnpm build \
  && mkdir -p /app/.data \
  && chown -R node:node /app/.data

USER node

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
