FROM node:22-alpine

WORKDIR /workspace
COPY package.json ./
COPY package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY server server
RUN npm run build --workspace server

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "server"]
