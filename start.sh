#!/bin/bash
# Arrancar pdf-service con PM2
pm2 start /pdf-service/index.js --name pdf-service --no-daemon &

# Arrancar Nginx en foreground
nginx -g "daemon off;"
