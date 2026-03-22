FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements /tmp/requirements
RUN pip install --no-cache-dir -r /tmp/requirements/production.txt

COPY backend /app

COPY infra/scripts/backend-entrypoint.sh /app/infra/scripts/backend-entrypoint.sh
RUN chmod +x /app/infra/scripts/backend-entrypoint.sh

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--access-logfile", "-", "--error-logfile", "-"]
