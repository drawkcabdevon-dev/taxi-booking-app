# Waymaker taxi booking backend — FastAPI on Cloud Run.
# Build from the repository root: docker build -t waymaker-taxi-backend .
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
WORKDIR /app/backend

# Cloud Run sets PORT; default to 8080 for local runs.
ENV PORT=8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
