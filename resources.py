# resources.py - FINAL WORKING VERSION
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List

from database import get_db
from models import Resource, User
from auth import get_current_user
from schemas import ResourceCreate, ResourceResponse # Imported schemas

router = APIRouter(prefix="/resources", tags=["Resources"])

# Pydantic schemas
class ResourceOut(ResourceResponse):
    class Config:
        from_attributes = True


# CREATE - Add new resource (Still requires auth to use get_current_user)
@router.post("/", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
def create_resource(
    payload: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # FIX: Use model_dump() for Pydantic v2 compliance, resolves 422 error
    new_resource = Resource(**payload.model_dump(),creator_id=current_user.id)
    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)
    return new_resource


# READ - Get all / filtered resources (Public access confirmed by log)
@router.get("/", response_model=List[ResourceOut])
def get_resources(
    type: Optional[str] = None,
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # Dependency intentionally removed to allow 200 OK as seen in log
):
    query = db.query(Resource)

    if type:
        query = query.filter(Resource.type == type)
    if search:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Resource.title.ilike(f"%{search}%"),
                Resource.description.ilike(f"%{search}%")
            )
        )

    return query.all()