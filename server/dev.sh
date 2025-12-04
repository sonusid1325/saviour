#!/bin/bash

# Development mode - runs with auto-reload and debug enabled

echo "🔧 Starting BlocSaviour Python Server in DEVELOPMENT mode"
echo ""

# Activate virtual environment
source .venv/bin/activate

# Set development environment variables
export FLASK_ENV=development
export FLASK_DEBUG=1

# Run with auto-reload
python -u app.py
