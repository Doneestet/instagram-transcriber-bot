FROM node:18-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install --no-cache-dir yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    ln -s /usr/local/bin/yt-dlp /usr/bin/yt-dlp && \
    yt-dlp --version

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install

# Copy app files
COPY . .

# Create temp directory
RUN mkdir -p temp

# Start the bot
CMD ["yarn", "start"]
