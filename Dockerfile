# Build stage
FROM node:25-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@8.10.0

WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_API_URL
ARG VITE_DATABASE_HOST
ARG VITE_DATABASE_PORT
ARG VITE_DATABASE_NAME
ARG VITE_DATABASE_USER
ARG VITE_DATABASE_PASSWORD
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_AWS_REGION
ARG VITE_COGNITO_DOMAIN
ARG VITE_COGNITO_REDIRECT_SIGNIN
ARG VITE_COGNITO_REDIRECT_SIGNOUT
ARG OPENAI_API_KEY

# Set environment variables for the build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DATABASE_HOST=$VITE_DATABASE_HOST
ENV VITE_DATABASE_PORT=$VITE_DATABASE_PORT
ENV VITE_DATABASE_NAME=$VITE_DATABASE_NAME
ENV VITE_DATABASE_USER=$VITE_DATABASE_USER
ENV VITE_DATABASE_PASSWORD=$VITE_DATABASE_PASSWORD
ENV VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID
ENV VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID
ENV VITE_AWS_REGION=$VITE_AWS_REGION
ENV VITE_COGNITO_DOMAIN=$VITE_COGNITO_DOMAIN
ENV VITE_COGNITO_REDIRECT_SIGNIN=$VITE_COGNITO_REDIRECT_SIGNIN
ENV VITE_COGNITO_REDIRECT_SIGNOUT=$VITE_COGNITO_REDIRECT_SIGNOUT
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV NODE_ENV=production

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Install wget for health checks
RUN apk add --no-cache wget

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]