FROM python:3.11-slim

WORKDIR /code

# Copy requirements list
COPY ./requirements.txt /code/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy application source code
COPY ./app /code/app

# Hugging Face Spaces routes traffic to port 7860 by default
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
