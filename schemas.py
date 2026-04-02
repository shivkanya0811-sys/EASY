# schemas.py
from pydantic import BaseModel
from typing import Optional

class RoomCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[str] = None  # comma-separated

# Resource schemas (for consistency)
class ResourceCreate(BaseModel):
    title: str
    description: Optional[str]
    link: Optional[str] = None
    type: str
    class Config:
        from_attributes = True
class ResourceResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    link: str
    type: str
    creator_id: int 
   
    class Config:
        from_attributes = True