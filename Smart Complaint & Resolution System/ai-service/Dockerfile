FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code, ML models and LLM generator
COPY backend/app /app/backend/app
COPY ml /app/ml
COPY llm /app/llm

# Set Python path to /app so import statements works
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
