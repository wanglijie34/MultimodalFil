import uvicorn
import os
from pathlib import Path
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.api.router import api_router
from app.db.session import engine
from app.db.base import SQLModel
from contextlib import asynccontextmanager

DEV_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(:\d+)?$"

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
        from app.models.file import File
        from sqlalchemy.future import select
        from app.services.file_service import file_service
        from app.services.file_profile_service import get_file_profile, get_supported_ingestion_extensions
        from app.services.ingestion_service import ingestion_service
        
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

            files_dir = Path(__file__).resolve().parents[2] / "files"
            if files_dir.exists():
                supported_types = set(get_supported_ingestion_extensions())
                for local_file in sorted(p for p in files_dir.iterdir() if p.is_file()):
                    file_type = local_file.suffix.lower().lstrip(".")
                    if file_type not in supported_types:
                        continue

                    existing = await db.execute(
                        select(File).where(
                            File.workspace_id == DEFAULT_WORKSPACE_ID,
                            File.original_filename == local_file.name
                        )
                    )
                    db_file = existing.scalar_one_or_none()
                    if not db_file:
                        db_file = await file_service.import_local_file(
                            db=db,
                            file_path=str(local_file),
                            workspace_id=DEFAULT_WORKSPACE_ID,
                            uploader_id=DEFAULT_USER_ID,
                        )

                    profile = get_file_profile(db_file.file_type, db_file.mime_type)
                    if profile["supported_for_ingestion"] and db_file.status != "indexed":
                        logger.info(f"Bootstrapping local file ingestion: {local_file.name}")
                        await ingestion_service.process_file(db_file.id, db)
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
    allow_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else []
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_origin_regex=DEV_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from fastapi.staticfiles import StaticFiles

    app.include_router(api_router, prefix=settings.API_V1_STR)
    
    # Mount files/covers as static
    covers_dir = Path(__file__).resolve().parents[2] / "files" / "covers"
    covers_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/covers", StaticFiles(directory=str(covers_dir)), name="covers")



    return app

app = create_app()


def _should_enable_reload() -> bool:
    value = os.getenv("UVICORN_RELOAD", "1").strip().lower()
    return value not in {"0", "false", "no", "off"}


def _run_with_safe_reload():
    app_dir = Path(__file__).resolve().parent
    repo_root = Path(__file__).resolve().parents[2]
    reload_enabled = _should_enable_reload()

    base_kwargs = {
        "app": "app.main:app",
        "host": "0.0.0.0",
        "port": 8000,
    }

    if not reload_enabled:
        logger.info("Starting backend without auto-reload (UVICORN_RELOAD disabled)")
        uvicorn.run(**base_kwargs, reload=False)
        return

    reload_excludes = [
        "*/__pycache__/*",
        "*.pyc",
        "*.pyo",
        ".git",
        "node_modules",
    ]

    try:
        logger.info(f"Starting backend with safe auto-reload, watching only: {app_dir}")
        uvicorn.run(
            **base_kwargs,
            reload=True,
            reload_dirs=[str(app_dir)],
            reload_excludes=reload_excludes,
        )
    except Exception as exc:
        logger.warning(
            f"Auto-reload watcher failed ({exc}). Falling back to non-reload server. "
            "Set UVICORN_RELOAD=0 to skip the watcher entirely."
        )
        uvicorn.run(**base_kwargs, reload=False)


if __name__ == "__main__":
    _run_with_safe_reload()
