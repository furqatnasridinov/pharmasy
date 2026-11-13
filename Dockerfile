# Этап 1: сборка React
FROM node:20-alpine AS frontend
WORKDIR /front
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Этап 2: FastAPI + статика
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend /front/dist ./static
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
