FROM node:14

COPY package*.json ./

RUN npm install

COPY . ./

EXPOSE 4000
EXPOSE 7474
EXPOSE 7687
EXPOSE 80

CMD [ "node", "index.js" ]