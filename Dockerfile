FROM node:20

RUN apt-get update -qq && DEBCONF_NOWARNINGS=yes apt-get install -y ffmpeg > /dev/null

RUN curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

ARG APPDIR=/usr/local/share/audiovideoconverter

RUN mkdir -p $APPDIR/node_modules && chown -R node:node $APPDIR
WORKDIR $APPDIR

USER node

COPY --chown=node:node package*.json ./
RUN npm config set update-notifier false && npm install > /dev/null

COPY --chown=node:node . ./

EXPOSE 8080
CMD [ "node", "AudioVideoConverterServer.js" ]
