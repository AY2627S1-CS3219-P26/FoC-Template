from pydantic import BaseModel
from ..services.rag_service import get_rag_system
from fastapi import HTTPException

class queryRequest(BaseModel):
    query: str
    conversation: list | None = None


async def post_query_rag_controller(request: queryRequest):
    try:
        response = await get_rag_system().rag_query(request.query, request.conversation)
        return {"query": request.query, "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_query_rag_controller(query: str):

    try:
        response = await get_rag_system().rag_query(query)
        return {"query": query, "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
