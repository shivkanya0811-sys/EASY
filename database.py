
from fastapi import HTTPException
from databases import Database
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, declarative_base
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://postgres:easy4@localhost:5432/mydatabase"  
)
engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
#ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
if "render.com" in DATABASE_URL:
    database = Database(DATABASE_URL, ssl=True)
else:
    database = Database(DATABASE_URL, ssl=False)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Tables ensured (create_all ran)")

def sync_schema_with_model():
    """Automatically add any missing columns that exist in model but not in DB"""
    inspector = inspect(engine)
    existing_columns = {col['name'] for col in inspector.get_columns("users")}
    
    required_columns = {
        "id", "email", "name", "password", "level", "xp", "streak",
        "avatar", "created_at", "is_active", "role"
    }
    
    missing = required_columns - existing_columns
    if not missing:
        logger.info("All required columns exist in 'users' table")
        return
    
    logger.warning(f"Missing columns detected: {missing}. Adding them now...")
    with engine.begin() as conn:
        for col in missing:
            if col == "name":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'User'"))
            elif col == "password":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT 'temp'"))
            elif col == "level":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1"))
            elif col == "xp":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0"))
            elif col == "streak":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0"))
            elif col == "avatar":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(512)"))
            elif col == "created_at":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"))
            elif col == "is_active":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true"))
            elif col == "role":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'"))
        # Removed obsolete check that referenced undefined variables (table_name, cols).
        logger.info(f"Added missing columns: {missing}")

def initialize_database():
    logger.info("Initializing and syncing database...")
    create_tables()
    sync_schema_with_model()
    logger.info("Database fully synced and ready!")
    return True