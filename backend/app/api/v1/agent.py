import re
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import desc, select

from app.agents.graph import agent_executor
from app.db.session import get_db
from app.models.agent import (
    AgentMessage,
    AgentRun,
    AgentRunPreference,
    AgentRunTitle,
    AgentStep,
    Citation,
)
from app.models.file import DocumentChunk, DocumentPage, File
from loguru import logger

router = APIRouter()

DEFAULT_WORKSPACE_ID = UUID("00000000-0000-0000-0000-000000000000")
DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")

WHITESPACE_PATTERN = re.compile(r"\s+")


class ConversationMessageIn(BaseModel):
    role: str
    content: str


class CreateRunRequest(BaseModel):
    run_id: Optional[UUID] = None
    query: str
    file_id: Optional[UUID] = None
    workspace_id: UUID = DEFAULT_WORKSPACE_ID
    conversation_messages: List[ConversationMessageIn] = []


class UpdateRunTitleRequest(BaseModel):
    title: str


class UpdateRunFavoriteRequest(BaseModel):
    favorite: bool


def _normalize_preview_text(text: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", (text or "")).strip()


def _truncate_highlight(text: str, max_chars: int = 220) -> str:
    normalized = _normalize_preview_text(text)
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 1].rstrip() + "…"


def _build_context_preview(source_text: str, highlight_text: str) -> Dict[str, str]:
    normalized_source = _normalize_preview_text(source_text)
    normalized_highlight = _truncate_highlight(highlight_text)

    if not normalized_source:
        return {
            "context_before": "",
            "highlight_text": normalized_highlight,
            "context_after": "",
            "preview_excerpt": normalized_highlight,
        }

    if not normalized_highlight:
        preview_excerpt = normalized_source[:360]
        if len(normalized_source) > 360:
            preview_excerpt += "…"
        return {
            "context_before": "",
            "highlight_text": "",
            "context_after": "",
            "preview_excerpt": preview_excerpt,
        }

    start = normalized_source.find(normalized_highlight)
    if start == -1 and len(normalized_highlight) >= 18:
        anchor = normalized_highlight[: min(len(normalized_highlight), 48)]
        start = normalized_source.find(anchor)
        if start != -1:
            normalized_highlight = normalized_source[start : min(len(normalized_source), start + len(normalized_highlight))]

    if start == -1:
        preview_excerpt = normalized_highlight
        return {
            "context_before": "",
            "highlight_text": normalized_highlight,
            "context_after": "",
            "preview_excerpt": preview_excerpt,
        }

    end = min(len(normalized_source), start + len(normalized_highlight))
    before_start = max(0, start - 180)
    after_end = min(len(normalized_source), end + 180)

    context_before = normalized_source[before_start:start].lstrip()
    context_after = normalized_source[end:after_end].rstrip()

    if before_start > 0:
        context_before = "…" + context_before
    if after_end < len(normalized_source):
        context_after = context_after + "…"

    preview_excerpt = f"{context_before}{normalized_highlight}{context_after}".strip()
    return {
        "context_before": context_before,
        "highlight_text": normalized_highlight,
        "context_after": context_after,
        "preview_excerpt": preview_excerpt,
    }


def _serialize_citation(citation: Citation, file_name: Optional[str], preview: Dict[str, str]) -> Dict[str, Any]:
    highlight_text = preview.get("highlight_text") or _truncate_highlight(citation.quote or "")
    return {
        "id": str(citation.id),
        "file_id": str(citation.file_id),
        "file_name": file_name or str(citation.file_id),
        "chunk_id": str(citation.chunk_id) if citation.chunk_id else None,
        "page_number": citation.page_number,
        "content": highlight_text or (citation.quote or ""),
        "quote": citation.quote or "",
        "score": citation.score,
        "context_before": preview.get("context_before", ""),
        "highlight_text": highlight_text,
        "context_after": preview.get("context_after", ""),
        "preview_excerpt": preview.get("preview_excerpt", highlight_text),
        "aspect": citation.aspect,
    }


async def _hydrate_citations(db: AsyncSession, citations: Iterable[Citation]) -> List[Dict[str, Any]]:
    citation_rows = list(citations)
    if not citation_rows:
        return []

    file_ids = {citation.file_id for citation in citation_rows}
    chunk_ids = {citation.chunk_id for citation in citation_rows if citation.chunk_id}
    page_pairs = {(citation.file_id, citation.page_number) for citation in citation_rows if citation.page_number}

    files_result = await db.execute(select(File).where(File.id.in_(file_ids)))
    files_by_id = {file_row.id: file_row for file_row in files_result.scalars().all()}

    chunks_by_id: Dict[UUID, DocumentChunk] = {}
    if chunk_ids:
        chunks_result = await db.execute(select(DocumentChunk).where(DocumentChunk.id.in_(chunk_ids)))
        chunks_by_id = {chunk.id: chunk for chunk in chunks_result.scalars().all()}

    pages_by_key: Dict[tuple[UUID, int], DocumentPage] = {}
    if page_pairs:
        file_filter_ids = {pair[0] for pair in page_pairs}
        page_filter_numbers = {pair[1] for pair in page_pairs}
        pages_result = await db.execute(
            select(DocumentPage).where(
                DocumentPage.file_id.in_(file_filter_ids),
                DocumentPage.page_number.in_(page_filter_numbers),
            )
        )
        pages_by_key = {(page.file_id, page.page_number): page for page in pages_result.scalars().all()}

    enriched: List[Dict[str, Any]] = []
    for citation in citation_rows:
        file_row = files_by_id.get(citation.file_id)
        chunk = chunks_by_id.get(citation.chunk_id) if citation.chunk_id else None
        page = pages_by_key.get((citation.file_id, citation.page_number)) if citation.page_number else None

        source_text = ""
        if page and page.text_content:
            source_text = page.text_content
        elif chunk and chunk.content:
            source_text = chunk.content
        elif citation.quote:
            source_text = citation.quote

        highlight_candidate = citation.quote or (chunk.content if chunk else "")
        preview = _build_context_preview(source_text, highlight_candidate)
        enriched.append(_serialize_citation(citation, file_row.original_filename if file_row else None, preview))

    return enriched


async def _get_run_or_404(db: AsyncSession, run_id: UUID, workspace_id: UUID) -> AgentRun:
    run_result = await db.execute(
        select(AgentRun).where(AgentRun.id == run_id, AgentRun.workspace_id == workspace_id)
    )
    run = run_result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return run


@router.post("/runs")
async def create_run(
    payload: CreateRunRequest,
    db: AsyncSession = Depends(get_db)
):
    initial_state = {
        "run_id": str(payload.run_id) if payload.run_id else str(uuid4()),
        "workspace_id": str(payload.workspace_id),
        "file_id": str(payload.file_id) if payload.file_id else None,
        "user_query": payload.query,
        "conversation_history": [msg.model_dump() for msg in payload.conversation_messages],
        "sub_queries": [],
        "required_aspects": [],
        "task_type": None,
        "document_chunks": {},
        "graph_chunks": {},
        "retrieved_chunks": {},
        "research_plan": None,
        "graph_findings": [],
        "verification_result": None,
        "coverage_report": None,
        "final_answer": None,
        "citations": {},
        "errors": [],
        "trace_logs": [],
        "retries": 0,
        "db": db,
    }

    final_state = await agent_executor.ainvoke(initial_state)

    answer = final_state.get("final_answer", "Error generating response.")
    raw_citations = final_state.get("citations", [])
    trace_logs = final_state.get("trace_logs", [])

    if payload.run_id:
        # Reuse existing run
        run_result = await db.execute(select(AgentRun).where(AgentRun.id == payload.run_id))
        run = run_result.scalar_one_or_none()
        if run:
            run.result = answer
            run.coverage_report = final_state.get("coverage_report")
            db.add(run)
        else:
            # Fallback if run_id not found
            run = AgentRun(
                id=payload.run_id,
                user_id=DEFAULT_USER_ID,
                workspace_id=payload.workspace_id,
                query=payload.query,
                status="completed",
                result=answer,
                coverage_report=final_state.get("coverage_report"),
            )
            db.add(run)
            db.add(AgentRunTitle(run_id=run.id, title=payload.query[:80]))
    else:
        # Create new run
        run = AgentRun(
            id=UUID(initial_state["run_id"]),
            user_id=DEFAULT_USER_ID,
            workspace_id=payload.workspace_id,
            query=payload.query,
            status="completed",
            result=answer,
            coverage_report=final_state.get("coverage_report"),
        )
        db.add(run)
        db.add(AgentRunTitle(run_id=run.id, title=payload.query[:80]))

    await db.flush()

    user_msg = AgentMessage(run_id=run.id, role="user", content=payload.query)
    assistant_msg = AgentMessage(run_id=run.id, role="assistant", content=answer)
    db.add(user_msg)
    db.add(assistant_msg)
    await db.flush()

    citation_rows: List[Citation] = []
    # 1. Collect all candidate file_ids
    candidate_file_ids = set()
    if isinstance(raw_citations, dict):
        for aspect, items in raw_citations.items():
            for item in items:
                f_id = item.get("file_id")
                if f_id and f_id != "Knowledge Graph":
                    try:
                        candidate_file_ids.add(UUID(str(f_id)))
                    except:
                        pass
    else:
        for item in raw_citations:
            f_id = item.get("file_id")
            if f_id and f_id != "Knowledge Graph":
                try:
                    candidate_file_ids.add(UUID(str(f_id)))
                except:
                    pass

    # 2. Filter out invalid file_ids to prevent foreign key errors
    valid_file_ids = set()
    if candidate_file_ids:
        from app.models.file import File
        valid_files_result = await db.execute(select(File.id).where(File.id.in_(candidate_file_ids)))
        valid_file_ids = set(valid_files_result.scalars().all())

    # 3. Create Citation rows safely and remap indices
    mapping = {}
    global_index = 1
    saved_index = 1

    if isinstance(raw_citations, dict):
        for aspect, items in raw_citations.items():
            for item in items:
                file_id_value = item.get("file_id")
                is_saved = False
                if file_id_value and file_id_value != "Knowledge Graph":
                    try:
                        f_uuid = UUID(str(file_id_value))
                        if f_uuid in valid_file_ids:
                            is_saved = True
                            citation_rows.append(
                                Citation(
                                    run_id=run.id,
                                    message_id=assistant_msg.id,
                                    file_id=f_uuid,
                                    chunk_id=UUID(str(item["chunk_id"]))
                                    if item.get("chunk_id") and item.get("chunk_id") != "graph-context"
                                    else None,
                                    page_number=item.get("page_number") if isinstance(item.get("page_number"), int) else None,
                                    aspect=aspect,
                                    quote=item.get("content"),
                                    score=float(item.get("score") or 0.0),
                                )
                            )
                    except Exception as exc:
                        logger.warning(f"Skipping citation persistence due to parse error: {exc}")
                if is_saved:
                    mapping[global_index] = saved_index
                    saved_index += 1
                global_index += 1
    else:
        for item in raw_citations:
            file_id_value = item.get("file_id")
            is_saved = False
            if file_id_value and file_id_value != "Knowledge Graph":
                try:
                    f_uuid = UUID(str(file_id_value))
                    if f_uuid in valid_file_ids:
                        is_saved = True
                        citation_rows.append(
                            Citation(
                                run_id=run.id,
                                message_id=assistant_msg.id,
                                file_id=f_uuid,
                                chunk_id=UUID(str(item["chunk_id"]))
                                if item.get("chunk_id") and item.get("chunk_id") != "graph-context"
                                else None,
                                page_number=item.get("page_number") if isinstance(item.get("page_number"), int) else None,
                                aspect="general",
                                quote=item.get("content"),
                                score=float(item.get("score") or 0.0),
                            )
                        )
                except Exception as exc:
                    logger.warning(f"Skipping citation persistence due to parse error: {exc}")
            if is_saved:
                mapping[global_index] = saved_index
                saved_index += 1
            global_index += 1

    # 4. Rewrite answer text to match saved citations
    def replace_source(match):
        idx_str = match.group(1)
        try:
            idx = int(idx_str)
            if idx in mapping:
                return f"[Source {mapping[idx]}]"
        except:
            pass
        return ""
    
    answer = re.sub(r'\[(?:Source\s*)?(\d+)\]', replace_source, answer, flags=re.IGNORECASE)
    run.result = answer
    assistant_msg.content = answer

    if citation_rows:
        db.add_all(citation_rows)
        await db.flush()

    enriched_citations = await _hydrate_citations(db, citation_rows)

    await db.commit()
    await db.refresh(run)

    logger.info(
        f"Agent Chat Run [{run.id}] Workspace [{payload.workspace_id}] - Query: '{payload.query}' | Citations: {len(citation_rows)}"
    )

    return {
        "run_id": str(run.id),
        "query": payload.query,
        "answer": answer,
        "citations": enriched_citations,
        "trace_logs": trace_logs,
        "coverage_report": run.coverage_report,
        "favorite": False,
    }


@router.get("/runs")
async def list_runs(
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AgentRun, AgentRunTitle, AgentRunPreference)
        .outerjoin(AgentRunTitle, AgentRunTitle.run_id == AgentRun.id)
        .outerjoin(AgentRunPreference, AgentRunPreference.run_id == AgentRun.id)
        .where(AgentRun.workspace_id == workspace_id)
        .order_by(desc(AgentRun.created_at))
    )
    res = await db.execute(stmt)
    rows = res.all()

    return [
        {
            "id": str(run.id),
            "query": run.query,
            "title": title.title if title else run.query,
            "result": run.result,
            "created_at": run.created_at,
            "favorite": preference.favorite if preference else False,
            "coverage_report": run.coverage_report,
        }
        for run, title, preference in rows
    ]


@router.get("/runs/{run_id}")
async def get_run(
    run_id: UUID,
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    run_stmt = (
        select(AgentRun, AgentRunTitle, AgentRunPreference)
        .outerjoin(AgentRunTitle, AgentRunTitle.run_id == AgentRun.id)
        .outerjoin(AgentRunPreference, AgentRunPreference.run_id == AgentRun.id)
        .where(AgentRun.id == run_id, AgentRun.workspace_id == workspace_id)
    )
    run_result = await db.execute(run_stmt)
    row = run_result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Agent run not found")

    run, title, preference = row

    messages_result = await db.execute(
        select(AgentMessage).where(AgentMessage.run_id == run_id).order_by(AgentMessage.created_at)
    )
    messages = messages_result.scalars().all()

    citations_result = await db.execute(select(Citation).where(Citation.run_id == run_id).order_by(Citation.id))
    citation_rows = citations_result.scalars().all()
    enriched_citations = await _hydrate_citations(db, citation_rows)

    citations_by_message: Dict[str, List[Dict[str, Any]]] = {}
    for citation in enriched_citations:
        matching_row = next((row for row in citation_rows if str(row.id) == citation["id"]), None)
        if not matching_row or not matching_row.message_id:
            continue
        citations_by_message.setdefault(str(matching_row.message_id), []).append(citation)

    return {
        "id": str(run.id),
        "query": run.query,
        "title": title.title if title else run.query,
        "result": run.result,
        "created_at": run.created_at,
        "favorite": preference.favorite if preference else False,
        "coverage_report": run.coverage_report,
        "messages": [
            {
                "id": str(message.id),
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at,
                "citations": citations_by_message.get(str(message.id), []),
            }
            for message in messages
        ],
    }


@router.patch("/runs/{run_id}/title")
async def update_run_title(
    run_id: UUID,
    payload: UpdateRunTitleRequest,
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    title_text = payload.title.strip()
    if not title_text:
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    await _get_run_or_404(db, run_id, workspace_id)

    title_result = await db.execute(select(AgentRunTitle).where(AgentRunTitle.run_id == run_id))
    title_row = title_result.scalar_one_or_none()
    if title_row:
        title_row.title = title_text[:120]
        title_row.updated_at = datetime.utcnow()
    else:
        db.add(AgentRunTitle(run_id=run_id, title=title_text[:120]))

    await db.commit()
    return {"message": "Run title updated successfully", "title": title_text[:120]}


@router.patch("/runs/{run_id}/favorite")
async def update_run_favorite(
    run_id: UUID,
    payload: UpdateRunFavoriteRequest,
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    await _get_run_or_404(db, run_id, workspace_id)

    pref_result = await db.execute(select(AgentRunPreference).where(AgentRunPreference.run_id == run_id))
    pref_row = pref_result.scalar_one_or_none()
    if pref_row:
        pref_row.favorite = payload.favorite
        pref_row.updated_at = datetime.utcnow()
    else:
        db.add(AgentRunPreference(run_id=run_id, favorite=payload.favorite))

    await db.commit()
    return {"message": "Run favorite updated successfully", "favorite": payload.favorite}


@router.delete("/runs/{run_id}")
async def delete_run(
    run_id: UUID,
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    await _get_run_or_404(db, run_id, workspace_id)

    await db.execute(delete(AgentRunPreference).where(AgentRunPreference.run_id == run_id))
    await db.execute(delete(AgentRunTitle).where(AgentRunTitle.run_id == run_id))
    await db.execute(delete(Citation).where(Citation.run_id == run_id))
    await db.execute(delete(AgentMessage).where(AgentMessage.run_id == run_id))
    await db.execute(delete(AgentStep).where(AgentStep.run_id == run_id))
    await db.execute(delete(AgentRun).where(AgentRun.id == run_id))
    await db.commit()

    return {"message": "Agent run deleted successfully"}


@router.delete("/runs")
async def clear_runs(
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    run_ids_result = await db.execute(select(AgentRun.id).where(AgentRun.workspace_id == workspace_id))
    run_ids = list(run_ids_result.scalars().all())

    if not run_ids:
        return {"message": "No agent runs to delete", "deleted_count": 0}

    await db.execute(delete(AgentRunPreference).where(AgentRunPreference.run_id.in_(run_ids)))
    await db.execute(delete(AgentRunTitle).where(AgentRunTitle.run_id.in_(run_ids)))
    await db.execute(delete(Citation).where(Citation.run_id.in_(run_ids)))
    await db.execute(delete(AgentMessage).where(AgentMessage.run_id.in_(run_ids)))
    await db.execute(delete(AgentStep).where(AgentStep.run_id.in_(run_ids)))
    await db.execute(delete(AgentRun).where(AgentRun.id.in_(run_ids)))
    await db.commit()

    return {"message": "Agent runs cleared successfully", "deleted_count": len(run_ids)}
