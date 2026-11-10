FROM node:26-alpine
WORKDIR /app
COPY package.json server.js fixtures.json ./
ENV NODE_ENV=production PORT=8000
EXPOSE 8000
USER node
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8000/healthz || exit 1
CMD ["node", "server.js"]
