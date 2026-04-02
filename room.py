# rooms.py 
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Room
from auth import get_current_user
from schemas import RoomCreate

router = APIRouter(prefix="/rooms", tags=["rooms"])


# ✅ Create Room
@router.post("/")
def create_room(
    payload: RoomCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    room = Room(
        name=payload.name,
        description=payload.description,
        tags=payload.tags,
        focus=50,
        members=0,
        live=False,
        owner_id=current_user.id
    )

    db.add(room)
    db.commit()
    db.refresh(room)

    # Transform to match frontend expectations
    return {
        "id": room.id,
        "title": room.name,
        "description": room.description,
        "members": room.members,
        "focus": room.focus,
        "tags": room.tags.split(", ") if room.tags else [],
        "live": room.live
    }


# ✅ Get All Rooms of Logged-in User
@router.get("/")
def get_rooms(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    rooms = db.query(Room).filter(Room.owner_id == current_user.id).all()
    
    # Transform to match frontend expectations
    return [
        {
            "id": room.id,
            "title": room.name,
            "description": room.description,
            "members": room.members,
            "focus": room.focus,
            "tags": room.tags.split(", ") if room.tags else [],
            "live": room.live
        }
        for room in rooms
    ]

