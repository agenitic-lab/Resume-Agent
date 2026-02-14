#!/bin/bash
# Clear Python bytecode cache
# Run this if you experience issues with old code being executed

echo "Clearing Python cache files..."

# Find and delete all __pycache__ directories
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null

# Find and delete all .pyc files
find . -type f -name "*.pyc" -delete 2>/dev/null
find . -type f -name "*.pyo" -delete 2>/dev/null

echo "✓ Cache cleared successfully!"
echo ""
echo "If running uvicorn, it should auto-reload."
echo "Otherwise, restart your Python server."
