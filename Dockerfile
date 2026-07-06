# ──────────────────────────────────────────────────────────────
# CalcPro Backend – Production Docker Image
# ──────────────────────────────────────────────────────────────
FROM python:3.12-slim

# Install system deps needed by psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m calcpro
WORKDIR /app

# Install Python dependencies first (layer-cache friendly)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY backend/wsgi.py ./wsgi.py

# Drop to non-root
USER calcpro

# Expose Flask/Gunicorn port
EXPOSE 5000

# Health check (requires curl in the image; using python fallback)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/health')"

# Production: Gunicorn with 4 workers
CMD ["gunicorn", \
     "--workers", "4", \
     "--bind", "0.0.0.0:5000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "backend.wsgi:app"]
