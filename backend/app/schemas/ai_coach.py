from pydantic import BaseModel, Field
from typing import List, Optional


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_history: List[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    reply: str
    disclaimer: str
    intent: str = "general"          # mine | calc | suggest | retire | progress | market | general
    sources: List[str] = []
    provider: str = "private"        # "private" means no outside model was used
    gateway: Optional[str] = None    # "prune" when the request went through the Prune gateway
    blocked: Optional[str] = None    # Prune Shield code if Prune refused the request
    receipt_signed: bool = False     # Prune returned a signed receipt for this answer
