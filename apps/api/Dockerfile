# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM node:26-alpine AS build
# Node 25+ no longer ships corepack; install the pnpm version from package.json.
RUN npm install -g pnpm@11.7.0
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @isitfishy/api...
COPY apps/api apps/api
RUN pnpm --filter @isitfishy/api build
# Copy the API with only its production dependencies into /out.
RUN pnpm --filter @isitfishy/api deploy --prod --legacy /out \
    && cp -r apps/api/dist /out/dist \
    && cd /out && node node_modules/prisma/build/index.js generate

FROM node:26-alpine
WORKDIR /app
COPY --from=build /out ./
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main"]
