import logging
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from ..services.rag_service import get_rag_system

logger = logging.getLogger(__name__)

# Everything in a request is sent to Claude, so these limits also cap what one request can cost.
MAX_QUERY_LENGTH = 1000
MAX_CONVERSATION_TURNS = 10
# Longer than a question because earlier assistant answers come back in the conversation.
MAX_TURN_LENGTH = 6000


class queryRequest(BaseModel):
    query: str
    conversation: list | None = None


def error_response(status_code: int, code: str, message: str):
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


def is_valid_turn(turn):
    return (
        isinstance(turn, dict)
        and turn.get("role") in ("user", "assistant")
        and isinstance(turn.get("content"), str)
        and len(turn["content"]) <= MAX_TURN_LENGTH
    )


async def post_query_rag_controller(request: queryRequest):
    if not request.query.strip() or len(request.query) > MAX_QUERY_LENGTH:
        return error_response(400, "INVALID_QUERY", f"Ask a question of at most {MAX_QUERY_LENGTH} characters")

    conversation = (request.conversation or [])[-MAX_CONVERSATION_TURNS:]
    if not all(is_valid_turn(turn) for turn in conversation):
        return error_response(400, "INVALID_CONVERSATION", "The conversation could not be read")

    try:
        response = await get_rag_system().rag_query(request.query, conversation)
        return {"query": request.query, "response": response}
    except Exception:
        logger.exception("Could not answer a query")
        return error_response(500, "ASSISTANT_FAILED", "The assistant could not answer right now. Try again later")
