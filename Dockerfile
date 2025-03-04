# Build Stage (React App Build)
FROM node:18 as build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV GOOGLE_CALENDAR_API_KEY=${GOOGLE_CALENDAR_API_KEY}

RUN npm run build

# Production Stage (Apache Server)
FROM ubuntu:20.04

RUN apt update && DEBIAN_FRONTEND=noninteractive apt install -y apache2 apache2-utils
WORKDIR /var/www/html

COPY --from=build /app/dist .
RUN a2enmod rewrite headers proxy proxy_http

RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html

COPY apache.conf /etc/apache2/sites-available/000-default.conf
EXPOSE 80
CMD ["apachectl", "-D", "FOREGROUND"]
