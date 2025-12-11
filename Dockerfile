FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all files except node_modules (handled by dockerignore)
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads/products
RUN mkdir -p public/uploads/files

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
USER node
CMD ["npm", "start"]
