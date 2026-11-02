from pydantic import BaseModel
from ..services.rag_service import model

class PromptRequest(BaseModel):
    prompt: str
    conversation: list

def post_prompt_rag(request: PromptRequest):

    return model.rag_query(request.prompt, request.conversation)


def get_prompt_rag(prompt: str):

    return model.rag_query(prompt)
