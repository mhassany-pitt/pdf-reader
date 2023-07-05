# Use the official Node.js 18 image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /pdf-store

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

RUN npm run build

# Set environment variables
ENV PRODUCTION=true

# Expose the port on which your NestJS app listens
EXPOSE 3000

# Specify the command to run your NestJS app
CMD ["npm", "run", "start:prod"]
