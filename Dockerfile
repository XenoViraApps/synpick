# Dockerfile for Synpick CLI Testing Environment
FROM node:22-slim

# Set environment variables
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_PROGRESS=false
ENV DEBIAN_FRONTEND=noninteractive

# Install curl for installer testing
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for testing
RUN adduser --disabled-password --gecos '' testuser
USER testuser
WORKDIR /home/testuser

# Set up test directories
RUN mkdir -p /home/testuser/workspace /home/testuser/logs /home/testuser/bin

# Copy the synpick source to container
COPY --chown=testuser:testuser . /home/testuser/workspace/synpick
WORKDIR /home/testuser/workspace/synpick

# Set up PATH for the test user
ENV PATH="/home/testuser/.local/bin:/home/testuser/bin:$PATH"

# Add test scripts to PATH
COPY --chown=testuser:testuser docker/test-scripts/*.sh /home/testuser/bin/
RUN chmod +x /home/testuser/bin/*.sh

# Default command for debugging
CMD ["/bin/bash"]
