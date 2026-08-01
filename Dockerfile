FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# A single port: the Vite dev server also serves the /api Functions.
# Signing in needs a .dev.vars file — see .dev.vars.example.
EXPOSE 5173

CMD ["npm", "run", "dev"]
