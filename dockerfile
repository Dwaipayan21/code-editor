FROM node:20-alpine

COPY ./backend .

CMD [ "node", "server.js" ]