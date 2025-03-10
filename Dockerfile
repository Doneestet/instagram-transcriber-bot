FROM node:18-slim

# Install yt-dlp and its dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

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