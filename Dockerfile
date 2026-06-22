# ─── Stage 1: Build pdf-service (Node.js) ─────────────────────────────────────
FROM node:20-alpine AS pdf-builder

WORKDIR /pdf-service

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY pdf-service/package*.json ./
RUN npm ci --omit=dev

COPY pdf-service/ .

# ─── Stage 2: Build React ─────────────────────────────────────────────────────
FROM node:20-alpine AS react-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_PDF_SERVICE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_PDF_SERVICE_URL=$VITE_PDF_SERVICE_URL

RUN npm run build

# ─── Stage 3: Final ───────────────────────────────────────────────────────────
FROM node:20-slim

RUN apt-get update && apt-get install -y \
  nginx \
  chromium \
  ghostscript \
  fonts-liberation \
  fonts-noto \
  fonts-noto-color-emoji \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && rm -f /etc/nginx/sites-enabled/default \
  && rm -f /etc/nginx/conf.d/default.conf

ENV CHROMIUM_PATH=/usr/bin/chromium

COPY --from=react-builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/app.conf

COPY --from=pdf-builder /pdf-service /pdf-service
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
