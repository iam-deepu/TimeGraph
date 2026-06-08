FROM python:3.11-slim

WORKDIR /code

# Copy requirements list from backend folder
COPY ./backend/requirements.txt /code/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy application source code from backend folder
COPY ./backend/app /code/app

# Render injects PORT env var; default to 10000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
