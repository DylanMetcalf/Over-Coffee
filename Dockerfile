# Over Coffee — production image. Node 22 + Chromium (for PDFs).
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
# Optional dependency: only needed when OC_WRITER=claude / model triage is on.
RUN npm install --omit=dev --no-audit --no-fund || true
COPY . .
ENV NODE_ENV=production PORT=8080 OC_DATA=/data OC_RESEARCH=rss OC_CHROME=/usr/bin/chromium
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--no-warnings=ExperimentalWarning", "server/index.js"]
