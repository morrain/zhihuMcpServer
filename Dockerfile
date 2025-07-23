# Use the official Puppeteer image which comes with Node.js and browser dependencies.
FROM ghcr.io/puppeteer/puppeteer:22.10.0

# The image has a `pptruser` user and the workdir is /home/pptruser.
# We are root by default during build, which is needed for `COPY --chown`.

# Copy package files and set ownership for the pptruser.
COPY --chown=pptruser:pptruser package*.json ./

# Switch to the non-root user before installing dependencies for security.
USER pptruser

# Install dependencies. This will create node_modules owned by pptruser.
RUN npm install

# Copy the rest of your application source code.
# This is done as pptruser, into pptruser's home directory.
COPY . .

# Compile the TypeScript source code.
RUN npm run build

# The default command to start the server.
CMD ["npm", "start"]