FROM node

WORKDIR /app

# names starting with package
COPY package*.json . 
# COPY package-lock.json package-lock.json 
RUN npm install
# COPY index.js index.js
# copy all files
COPY . .




CMD [ "node","index.js" ]