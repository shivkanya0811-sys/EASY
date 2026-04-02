from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router # Only import the router itself
from resources import router as resources_router
from database import database # Import the database object directly
from websocket import router as websocket_router
from websocket import router as websocket_router
app = FastAPI(title="FocusMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
       # "http://localhost:8000",
        "exp://10.188.21.239:8000",
        "*"
    ],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(resources_router)
app.include_router(websocket_router)

@app.get("/")
def root():
    return {"message": "FocusMate API is running"}

# FIX: Define the startup/shutdown events directly on the main app, 
# using the 'database' object imported from database.py.
@app.on_event("startup")
async def startup():
    # Call the connect method on the database object
    await database.connect()
    
@app.on_event("shutdown")
async def shutdown():
    # Call the disconnect method on the database object
    await database.disconnect()
    