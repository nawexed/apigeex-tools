FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5000
ENV FLASK_DEBUG=0

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl bash tar \
    && curl -fsSLk https://sdk.cloud.google.com -o /tmp/google-cloud-sdk-install.sh \
    && bash /tmp/google-cloud-sdk-install.sh --disable-prompts --install-dir=/opt \
    && rm -f /tmp/google-cloud-sdk-install.sh \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/google-cloud-sdk/bin:${PATH}"

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN python3 -m pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY data/ ./data/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

EXPOSE 5000

CMD ["python3", "app.py"]