import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.api.router import api_router
from app.db.session import engine
from app.db.base import SQLModel

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
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

    @app.on_event("startup")
    async def startup_event():
        logger.info("Starting up InsightGraph Agent Backend...")
        # Create tables if they don't exist (MVP approach)
        try:
            async with engine.begin() as conn:
                await conn.run_sync(SQLModel.metadata.create_all)
            logger.info("Database tables initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")

    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("Shutting down InsightGraph Agent Backend...")

    return app

app = create_app()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
