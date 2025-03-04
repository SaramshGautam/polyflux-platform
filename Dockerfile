# Use an official lightweight Python image
FROM python:3.11

# Set the working directory
WORKDIR /app

# Copy all files to the container
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV PORT=8080

# Expose the port Cloud Run will use
EXPOSE 8080

# Run the app
# CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8080", "app:app"]
CMD ["gunicorn", "-w", "4", "--timeout", "0", "--bind", "0.0.0.0:8080", "app:app"]

