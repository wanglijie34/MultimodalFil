from fastapi import APIRouter
from app.api.v1 import health, files, search, agent, graph, reports, websockets, system, books

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])
api_router.include_router(graph.router, prefix="/graph", tags=["graph"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(websockets.router, tags=["websockets"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(books.router, prefix="/books", tags=["books"])

# Future routers
# api_router.include_router(search.router, prefix="/search", tags=["search"])
# api_router.include_router(agent.router, prefix="/agent", tags=["agent"])
# api_router.include_router(graph.router, prefix="/graph", tags=["graph"])
# api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
