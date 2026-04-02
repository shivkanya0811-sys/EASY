# auth.py (Updated)
from fastapi import Form, HTTPException, Depends, APIRouter, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone # ADDED timezone for best practice
from typing import Annotated
import logging
from sqlalchemy.orm import Session 
from sqlalchemy.exc import IntegrityError 

# Use ORM dependencies
from database import get_db 
from models import User 

# --- Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SECRET_KEY = "super_secret_key_123" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

# --- Utility Functions ---

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire.timestamp()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Schemas ---
class UserSchema(BaseModel):
    # Added ID to match the ORM model and provide unique identification
    id: int 
    name: str
    email: str
    avatar: str | None = None # Added avatar field for frontend header

class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    # Return basic user data upon successful login
    user_data: UserSchema 


# --- Core Logic Functions (Synchronous ORM) ---

def get_user_orm(db: Session, email: str):
    """Fetches a user by email using the ORM Session."""
    return db.query(User).filter(User.email == email).first()

def get_user_orm_by_id(db: Session, user_id: int):
    """Fetches a user by ID using the ORM Session."""
    return db.query(User).filter(User.id == user_id).first()


# --- Router Endpoints ---

@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterSchema, db: Session = Depends(get_db)):
    """Handles user registration."""
    if get_user_orm(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        new_user = User(
            name=payload.name,
            email=payload.email,
            password=get_password_hash(payload.password),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Return the newly created user's non-sensitive data
        return UserSchema(
            id=new_user.id, 
            name=new_user.name, 
            email=new_user.email,
            avatar=new_user.avatar
        )

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Registration failed due to data conflict.")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error during registration")


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)):
    """Handles user login and issues a JWT access token."""
    user = get_user_orm(db, form_data.username) # 'username' is used as 'email'

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # CRITICAL: Include user_id in the token payload for easy retrieval later
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id}, 
        expires_delta=access_token_expires
    )
    
    user_data = UserSchema(
        id=user.id, 
        name=user.name, 
        email=user.email,
        avatar=user.avatar
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user_data": user_data}

# --- Current User Dependency (Updated to use ORM by ID) ---

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id") 
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Fetch user using ORM by ID
    user = get_user_orm_by_id(db, user_id) 
    if user is None:
        raise credentials_exception
        
    return user # Returns the ORM User object

# --- User Info Endpoint ---

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    """Returns the currently authenticated user's data."""
    # current_user is the ORM object, which is automatically converted to UserSchema
    return current_user