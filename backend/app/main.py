import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.api.router import api_router
from app.db.session import engine
from app.db.base import SQLModel
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up InsightGraph Agent Backend...")
    # Create tables if they don't exist (MVP approach)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        logger.info("Database tables initialized")
        
        # Seed default user and workspace
        from app.db.session import AsyncSessionLocal
        from app.models.user import User, Workspace
        from sqlalchemy.future import select
        import uuid
        
        DEFAULT_WORKSPACE_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")
        DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
        
        async with AsyncSessionLocal() as db:
            user = await db.execute(select(User).where(User.id == DEFAULT_USER_ID))
            if not user.scalar_one_or_none():
                db_user = User(
                    id=DEFAULT_USER_ID,
                    email="admin@example.com",
                    display_name="Admin",
                    password_hash="fakehash",
                    role="admin"
                )
                db.add(db_user)
                await db.commit()
                
            workspace = await db.execute(select(Workspace).where(Workspace.id == DEFAULT_WORKSPACE_ID))
            if not workspace.scalar_one_or_none():
                db_workspace = Workspace(
                    id=DEFAULT_WORKSPACE_ID,
                    owner_id=DEFAULT_USER_ID,
                    name="Default Workspace",
                    description="Default workspace for all files"
                )
                db.add(db_workspace)
                await db.commit()
        logger.info("Database seeded with default user and workspace")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    yield
    logger.info("Shutting down InsightGraph Agent Backend...")

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        lifespan=lifespan,
    )

    # Set all CORS enabled origins
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(api_router, prefix=settings.API_V1_STR)



    return app

app = create_app()

if __name__ == "__main__":
    # touch to reload
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
