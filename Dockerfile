FROM node:20.15-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy only package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the application's port
EXPOSE 3000

# Start the application npm run dev
CMD ["npm", "run", "dev"]