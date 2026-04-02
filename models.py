from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False, default="User")
    password = Column(String(255), nullable=False)
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    avatar = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    role = Column(String(50), default="user")

    rooms = relationship("Room", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"

class Room(Base):
    __tablename__ = "rooms"   

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(String(512), nullable=True)
    focus = Column(Integer, default=None )
    members = Column(Integer, default=1)  
    live = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="rooms")

    def __repr__(self):
        return f"<Room '{self.name}' by {self.owner_id}>"
class Resource(Base):
    __tablename__ = "resources"   
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    link = Column(String(512), nullable=True)    
    type = Column("resource_type",String(100), nullable=False)    
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ✅ ADD THIS
    creator = relationship("User")


    def __repr__(self):
        return f"<Resource {self.title}>"