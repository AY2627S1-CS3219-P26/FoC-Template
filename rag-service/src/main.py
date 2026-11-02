from fastapi import FastAPI, HTTPException
from .services.rag_service import boostrap_rag_system
from .controller.rag_controller import (
    queryRequest,
    post_query_rag_controller,
    get_query_rag_controller,
)

# uv run fastapi dev
# conda deactivate
# source .venv/bin/activate
# uvicorn src.main:app --reload --host 0.0.0.0 --port 3080

app = FastAPI()
boostrap_rag_system()

@app.get("/")
async def root():
    return {"message": "Welcome to Friend on Campus NUS Rag System"}

@app.get("/health/")
async def health():
    return {"status": "ok"}


@app.post("/query/")
async def post_query_raq(request: queryRequest):
    return await post_query_rag_controller(request)


@app.get("/query/")
async def get_query_rag(query: str):
    return await get_query_rag_controller(query)
