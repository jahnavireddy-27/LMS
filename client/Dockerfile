FROM node:22-alpine

WORKDIR /workspace
COPY package.json ./
COPY package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY client client
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build --workspace client

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "client"]
