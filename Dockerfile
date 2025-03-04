# Build Stage (React App Build)
FROM node:18 as build
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy project files
COPY . .

# Environment Variables (Optional)
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV GOOGLE_CALENDAR_API_KEY=${GOOGLE_CALENDAR_API_KEY}

# Build React App
RUN npm run build

---

# Production Stage (Apache Server)
FROM ubuntu:20.04

# Install Apache and Dependencies
RUN apt update && apt install -y apache2 apache2-utils

# Set Apache as the Work Directory
WORKDIR /var/www/html

# Copy Built React App to Apache Root Directory
COPY --from=build /app/dist .

# Enable Apache Modules
RUN a2enmod rewrite headers proxy proxy_http

# Set Permissions
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html

# Copy Custom Apache Configuration
COPY apache.conf /etc/apache2/sites-available/000-default.conf

# Expose Port 80
EXPOSE 80

# Start Apache in Foreground
CMD ["apachectl", "-D", "FOREGROUND"]
