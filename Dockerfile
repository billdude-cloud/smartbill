# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN cd backend && npm install

# Copy backend source code
COPY backend/ ./backend/

# Copy frontend files (since backend serves them)
COPY frontend/ ./frontend/

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "backend/server.js"]