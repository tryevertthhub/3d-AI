# Dockerfile
FROM node:20

# Create app directory
WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the code
COPY . .

# Expose ports
EXPOSE 5173

# Run Vite dev server (default port is 5173)
CMD ["npm", "run", "dev"]
