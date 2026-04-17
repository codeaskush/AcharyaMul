# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Backend + serve frontend
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy built frontend into /app/static
COPY --from=frontend-build /frontend/dist /app/static

RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["sh", "-c", "python -c 'from app.database import init_db; init_db()' && python seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
