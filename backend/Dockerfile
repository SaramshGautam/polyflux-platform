# Use an official lightweight Python image
FROM python:3.11

ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Copy all files to the container
COPY . .

RUN pip install --upgrade pip

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV PORT=8080

# Expose the port Cloud Run will use
EXPOSE 8080

# Run the app
# CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8080", "app:app"]
# CMD ["gunicorn", "-w", "4","--threads", "8", "--timeout", "120", "--bind", "0.0.0.0:8080", "app:app"]
# CMD ["gunicorn", "-w", "4","--threads", "8", "--timeout", "120", "--bind", ":$PORT", "app:app"]
CMD ["sh","-c","gunicorn -w ${GUNICORN_WORKERS:-4} --threads ${GUNICORN_THREADS:-8} --timeout ${GUNICORN_TIMEOUT:-120} --bind :${PORT:-8080} --access-logfile - --error-logfile - app:app"]


