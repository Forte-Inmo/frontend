FROM node:20-slim AS pdf-builder

WORKDIR /pdf-service
COPY pdf-service/package*.json ./
RUN npm install --omit=dev

# ─── Stage 2: Build React ─────────────────────────────────────────────────────
FROM node:20-alpine AS react-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# ─── Stage 3: Final ───────────────────────────────────────────────────────────
FROM node:20-slim

# Instalar Nginx + Chromium + dependencias de Puppeteer
RUN apt-get update && apt-get install -y \
  nginx \
  chromium \
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

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copiar build de React
COPY --from=react-builder /app/dist /usr/share/nginx/html

# Copiar nginx.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copiar pdf-service
WORKDIR /pdf-service
COPY --from=pdf-builder /pdf-service/node_modules ./node_modules
COPY pdf-service/ .

# Instalar PM2 para manejar ambos procesos
RUN npm install -g pm2

# Script de arranque
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]