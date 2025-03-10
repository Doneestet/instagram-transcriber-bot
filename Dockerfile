FROM node:18-slim

# Install yt-dlp and its dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install yt-dlp

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app files
COPY . .

# Create temp directory
RUN mkdir -p temp

# Start the bot
CMD ["npm", "start"] 