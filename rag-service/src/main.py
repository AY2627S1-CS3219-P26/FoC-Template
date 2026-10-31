from fastapi import FastAPI
from .controller.rag_controller import PromptRequest, post_prompt_rag, get_prompt_rag


# uv run fastapi dev
app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/prompt/")
async def post_prompt(request: PromptRequest):
    return post_prompt_rag(request)


@app.get("/prompt/")
async def get_prompt(prompt: str):
    return get_prompt_rag(prompt)
