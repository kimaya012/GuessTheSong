ARG NODE_VERSION = 22 

#bundle the dependencies
FROM node:${NODE_VERSION}-bookworm-slim AS deps 
WORKDIR /app 
COPY package.json package-lock.json ./ 
RUN npm ci 

FROM deps AS builder 
#Since NEXT_PUBLIC_* values are bundled into the browser bundle at build time, so they
#must exist here, not only when the container starts
ARG NEXT_PUBLIC_CONTACT_EMAIL 
ARG NEXT_PUBLIC_ADSENSE_CLIENT_ID
ARG NEXT_PUBLIC_ADSENSE_SLOT_RESULT
ARG NEXT_PUBLIC_ADSENSE_SLOT_ARCHIVE
ARG NEXT_PUBLIC_ADSENSE_SLOT_STATS
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .   
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run build 

#migrate: one-off job that applies drizzle migrations
FROM deps AS migrate 
WORKDIR /app 
COPY dirzzle.config.ts ./ 
COPY db ./db 
COPY dirzzle ./drizzle  
COPY scripts/load-env.ts ./scripts/load-env.ts
CMD ["npx", "drizzle-kit", "migrate"]

#runner: small image which serves traffic
FROM node:${NODE_VERSION}-bookworm-slim AS runner 
WORKDIR /app 
ENV NODE_ENV=production \
    NEXT_TELEMEATRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 
COPY --from=builder --chwon=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public 
USER node 
EXPOSE 3000 
HEALTHCHECK --interval= --timeout=10s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/privacy').then(r=> process.exit(r.ok?0:1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]