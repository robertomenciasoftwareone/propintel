FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install playwright browsers
RUN playwright install chromium

COPY . .

# Run scraper: madrid only, 3 pages, no scheduler (runs once and exits)
CMD ["python", "main.py", "--ciudad", "madrid", "--paginas", "3"]
