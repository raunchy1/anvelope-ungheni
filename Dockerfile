# Aplicatia de fise, pregatita pentru Coolify.
#
# Nu primeste nicio variabila de mediu, intentionat: `src/lib/supabase-config.ts`
# tine proiectul Supabase fixat in cod. De-aia mutarea intre conturi a durat
# cinci minute in septembrie, si de-aia porneste aici fara configurare.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

# ------------------------------------------------------------------ pachete
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ----------------------------------------------------------------- build-ul
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ----------------------------------------------------------------- pornirea
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
