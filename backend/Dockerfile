# Development stage
FROM python:3.11-slim AS development

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM python:3.11-slim AS production

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads

# Create tables (create_all is idempotent) then optionally seed, then start server
CMD ["sh", "-c", "python -c 'from app.database import init_db; init_db()' && python seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]
