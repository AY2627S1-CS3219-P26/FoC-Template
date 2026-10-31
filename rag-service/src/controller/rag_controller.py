from pydantic import BaseModel
from ..services.rag_service import prompt_rag

class PromptRequest(BaseModel):
    prompt: str
    conversation: list

def post_prompt_rag(request: PromptRequest):

    return prompt_rag(request.prompt, request.conversation)


def get_prompt_rag(prompt: str):

    return prompt_rag(prompt)
