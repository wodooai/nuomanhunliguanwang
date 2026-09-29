FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4188
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 4188
CMD ["node", "server.js"]
