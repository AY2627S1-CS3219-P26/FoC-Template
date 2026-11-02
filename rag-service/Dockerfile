# FROM python:3.11-slim
# COPY --from=ghcr.io/astral-sh/uv:0.8.14 /uv /uvx /bin/

# WORKDIR /app
# ENV UV_PYTHON_DOWNLOADS=never
# ENV HF_HOME=/app/.cache/huggingface

# RUN useradd --create-home app && chown app /app
# USER app

# COPY pyproject.toml uv.lock .python-version ./
# # --no-cache keeps uv's download cache out of the image.
# RUN uv sync --frozen --no-dev --no-install-project --no-cache

# # The model is part of the image, so a new container starts without downloading it.
# RUN .venv/bin/python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2', device='cpu')"
# ENV HF_HUB_OFFLINE=1

# COPY src ./src

# ENV PATH=/app/.venv/bin:$PATH
# EXPOSE 3080
# CMD ["fastapi", "run", "--port", "3080"]

#docker run -d -p 3080:3080 relay-rag-service:latest
#docker build -t rag-service:latest . remember to anme bbay
FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app
ENV NODE_ENV=production
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project



COPY . .
RUN uv sync --frozen
EXPOSE 3080
CMD ["uv", "run", "--no-dev", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3080"]
