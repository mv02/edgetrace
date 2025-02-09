from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import database

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(database.router)
