# QRChat — imagen para desplegar en cualquier hosting con contenedores
# (Railway, Fly.io, Koyeb, un VPS con Docker…)
#
#   docker build -t qrchat .
#   docker run -p 3000:3000 qrchat
#
FROM node:20-alpine

WORKDIR /app

# Dependencias primero para aprovechar la caché de capas
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
