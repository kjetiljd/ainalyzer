# Ainalyzer - Multi-repository code analysis
FROM python:3.12-slim

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    cloc \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy application
COPY aina aina_lib.py ./
COPY frontend/ frontend/

# Build frontend
RUN cd frontend && npm install && npm run build

# Create aina data directory
RUN mkdir -p /root/.aina/analysis

EXPOSE 8080

# Default: serve the frontend
CMD ["./aina", "serve", "--no-browser", "-p", "8080"]
