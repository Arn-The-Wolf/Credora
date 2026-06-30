FROM python:3.12-slim
WORKDIR /app
ENV PIP_DEFAULT_TIMEOUT=300 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1
RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip install --retries 10 -r requirements.txt
COPY app ./app
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=30s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
