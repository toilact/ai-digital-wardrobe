#!/usr/bin/env bash
set -e

mkdir -p ai-service/checkpoints

echo "Downloading lip.pth..."
curl -L -o ai-service/checkpoints/lip.pth \
"https://huggingface.co/aravindhv10/Self-Correction-Human-Parsing/resolve/main/checkpoints/lip.pth"

echo "Done: ai-service/checkpoints/lip.pth"
