# Built from the repository root, because shared contexts or root setups may be needed:
#   docker build -f order-service/Dockerfile .
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy package files from the order-service directory
COPY order-service/package.json order-service/package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY order-service/src ./src

# Set default port and environment variables
ENV ORDER_SERVICE_PORT=3003

USER node
EXPOSE 3003

# Native health check matching the rest of the microservices
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.ORDER_SERVICE_PORT || 3003) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", "src/index.ts"]