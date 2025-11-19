# ================================
# 1) BASE IMAGE (node + libreoffice + imagemagick)
# ================================
FROM debian:stable

# Sistem güncellemesi
RUN apt-get update && apt-get upgrade -y

# Node yükle
RUN apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# LibreOffice + ImageMagick
RUN apt-get install -y libreoffice imagemagick ghostscript

# Timezone fix
RUN ln -fs /usr/share/zoneinfo/Europe/Istanbul /etc/localtime

# App dosyaları
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Port Render için doğru ayar
ENV PORT=10000

EXPOSE 10000

CMD ["node", "server.js"]
