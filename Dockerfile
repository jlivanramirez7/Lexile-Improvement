# Dockerfile for DRC BEACON ELA Simulator Cloud Run Deployment
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8080

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app ./app

# Expose container port
EXPOSE 8080

# Command to run the Uvicorn ASGI server
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
