FROM python:3.11-slim

WORKDIR /app

# 1) System deps (thêm git để pip install git+... không fail)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
  && rm -rf /var/lib/apt/lists/*

# 2) Python deps
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 3) Copy code
COPY . /app

# 4) Copy checkpoints vào image
#    (bạn phải có file trong ai-service/checkpoints trước khi build)
COPY checkpoints/ /app/checkpoints/

# 5) Default env cho SAM
ENV ENABLE_SAM=1
ENV SAM_MODEL_TYPE=vit_b
ENV SAM_CHECKPOINT=/app/checkpoints/sam_vit_b_01ec64.pth
ENV SAM_MAX_SIDE=1024

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]