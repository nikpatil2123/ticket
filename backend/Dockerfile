# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the NestJS application
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy only the compiled output and production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install ONLY production dependencies
RUN npm ci --only=production

# Expose the API port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]
