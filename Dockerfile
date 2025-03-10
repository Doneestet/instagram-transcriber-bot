FROM node:18-slim

# Install yt-dlp and its dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl wget && \
    wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    yt-dlp --version # Verify installation

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
