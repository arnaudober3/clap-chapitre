FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173 8788

CMD ["npm", "run", "dev:all"]
