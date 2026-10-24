FROM node:24-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV OFFICECLI_SKIP_UPDATE=1

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.28.5 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# The installer places the self-contained binary under the package's vendor directory.
RUN node node_modules/@officecli/officecli/install.js \
  && ln -sf /app/node_modules/@officecli/officecli/vendor/officecli /usr/local/bin/officecli \
  && officecli --version

COPY . .
ENV NODE_ENV=production
RUN pnpm build

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
