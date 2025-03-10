FROM node:18-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl wget && \
    pip3 install --no-cache-dir yt-dlp && \
    ln -s /usr/local/bin/yt-dlp /usr/bin/yt-dlp && \
    yt-dlp --version && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install

# Copy app files
COPY . .

# Create temp directory
RUN mkdir -p temp && \
    chmod 777 temp

# Verify yt-dlp installation
RUN yt-dlp --version

# Start the bot
CMD ["yarn", "start"]
