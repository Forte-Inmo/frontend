FROM ghcr.io/puppeteer/puppeteer:21.0.0

USER root
RUN apt-get update && apt-get install -y ghostscript --no-install-recommends && rm -rf /var/lib/apt/lists/*
USER puppeteer

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=3001

EXPOSE 3001

CMD ["node", "index.js"]
