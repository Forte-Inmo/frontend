#!/bin/bash
node /pdf-service/index.js &
nginx -g "daemon off;"
