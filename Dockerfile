# Use the official Node.js Alpine image as a base.
FROM node:22-alpine

# Install necessary dependencies for Puppeteer on Alpine.
# We install chromium manually, so we'll tell Puppeteer to skip its own download.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev

# Tell Puppeteer to use the system-installed Chromium.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create a non-root user and a home directory.
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser
ENV HOME=/home/pptruser
WORKDIR ${HOME}

# Copy package files and set ownership.
COPY --chown=pptruser:pptruser package*.json ./

# Switch to the non-root user before installing dependencies.
USER pptruser

# Install dependencies.
RUN npm install

# Copy the rest of your application source code.
# The user is already pptruser, so no need for --chown
COPY . .

# Compile the TypeScript source code.
RUN npm run build

# The default command to start the server.
CMD ["npm", "start"]
