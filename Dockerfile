FROM mcr.microsoft.com/playwright:v1.50.0-jammy

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy project files
COPY . .

# Build TypeScript source and React dashboard
RUN npm run build

# Default environment variables
ENV NODE_ENV=production
ENV MOCK_PORT=4000
ENV DASHBOARD_PORT=3000

EXPOSE 3000 4000

# Default command runs test suite then starts dashboard
CMD ["sh", "-c", "npm run rbp:mock & sleep 2 && npm run rbp:test && npm run rbp:dashboard"]
