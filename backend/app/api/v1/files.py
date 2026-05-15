from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.file_service import file_service
from app.services.ingestion_service import ingestion_service
from app.schemas.file import FileRead, FileUploadResponse
from app.core.exceptions import NotFoundException

router = APIRouter()

# TODO: Replace with actual auth dependencies
DEFAULT_WORKSPACE_ID = UUID("00000000-0000-0000-0000-000000000000")
DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: UUID = Form(DEFAULT_WORKSPACE_ID),
    folder_id: Optional[UUID] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    db_file = await file_service.upload_file(
        db=db,
        upload_file=file,
        workspace_id=workspace_id,
        uploader_id=DEFAULT_USER_ID,
        folder_id=folder_id
    )
    
    background_tasks.add_task(ingestion_service.process_file, db, db_file.id)
    
    return FileUploadResponse(
        file_id=db_file.id,
        filename=db_file.original_filename,
        status=db_file.status,
        message="File uploaded successfully."
    )

@router.get("", response_model=List[FileRead])
async def list_files(
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    folder_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    return await file_service.list_files(db, workspace_id, folder_id)

@router.get("/{file_id}", response_model=FileRead)
async def get_file(
    file_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    db_file = await file_service.get_file(db, file_id)
    if not db_file:
        raise NotFoundException(f"File with id {file_id} not found")
    return db_file

@router.delete("/{file_id}")
async def delete_file(
    file_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    success = await file_service.delete_file(db, file_id)
    if not success:
        raise NotFoundException(f"File with id {file_id} not found")
    return {"message": "File deleted successfully"}
