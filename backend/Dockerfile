# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the NestJS application
RUN npm run build

# Compile the standalone admin seed script for the production image
RUN npx tsc seed-admin.ts --outDir dist --module nodenext --moduleResolution nodenext --target ES2023 --esModuleInterop --skipLibCheck --declaration false --sourceMap false

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy only the compiled output and production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install ONLY production dependencies
RUN npm install --only=production

# Expose the API port
EXPOSE 3001

# Start the application
CMD ["node", "dist/src/main.js"]
