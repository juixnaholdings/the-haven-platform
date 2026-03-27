FROM nginx:1.27-alpine

COPY infra/nginx/production.conf /etc/nginx/conf.d/default.conf
