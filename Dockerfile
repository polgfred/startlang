FROM node:22
WORKDIR /app
COPY package.json package-lock.json ./
COPY ./apps/web/package.json ./apps/web/package.json
COPY ./packages/lang-core/package.json ./packages/lang-core/package.json
COPY ./packages/lang-browser/package.json ./packages/lang-browser/package.json
RUN npm clean-install
COPY ./apps ./apps
COPY ./packages ./packages
COPY eslint.config.js reference.md tsconfig.base.json tsconfig.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @startlang/web

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir .next
RUN chown nextjs:nodejs .next
COPY --from=0 --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=0 --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=0 --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
