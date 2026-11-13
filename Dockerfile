FROM node:22-slim

WORKDIR /app

# Install all dependencies including build tools (uses glibc for sharp, rolldown, oxide & baileys)
COPY package.json ./
RUN npm install --include=dev --legacy-peer-deps --no-audit --no-fund

# Copy application source and build the Vite frontend
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
