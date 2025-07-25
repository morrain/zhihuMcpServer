# Use the official Puppeteer image which comes with Node.js and browser dependencies.
FROM ghcr.nju.edu.cn/puppeteer/puppeteer:22.10.0

# Set working directory
WORKDIR /home/pptruser

# Copy package files
COPY package*.json ./

# Install dependencies as root
RUN npm install

# Copy the rest of your application source code.
COPY . .

# Create a directory for QR codes.
RUN mkdir -p qrcodes

# Change ownership of the entire application directory to pptruser
RUN chown -R pptruser:pptruser /home/pptruser

# Switch to the non-root user for security.
USER pptruser

# Compile the TypeScript source code.
RUN npm run build

# The default command to start the server.
CMD ["npm", "start"]
