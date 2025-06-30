# Build the image
docker build -t snake-chess .

# Run the container
docker run -p 3000:80 snake-chess
