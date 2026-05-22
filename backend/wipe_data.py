import asyncio
import os
from sqlalchemy import text
from app.db.session import engine
from app.integrations.neo4j_client import neo4j_integration
from app.integrations.qdrant_client import qdrant_integration
from app.integrations.minio_client import minio_client
from loguru import logger

async def wipe_all():
    logger.info("Wiping Postgres...")
    tables = ["chunkentity", "entityrelation", "entity", "documentchunk", "documentpage", "file"]
    for table in tables:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
            logger.info(f"Truncated {table}")
        except Exception as e:
            logger.error(f"Could not truncate {table}: {e}")

    logger.info("Wiping Neo4j...")
    try:
        neo4j_integration.run_query("MATCH (n) DETACH DELETE n")
        logger.info("Neo4j graph cleared.")
    except Exception as e:
        logger.error(f"Failed to clear Neo4j: {e}")

    logger.info("Wiping Qdrant...")
    try:
        qdrant_integration.client.delete_collection(qdrant_integration.collection_name)
        qdrant_integration._ensure_collection()
        logger.info("Qdrant collection cleared and recreated.")
    except Exception as e:
        logger.error(f"Failed to clear Qdrant: {e}")

    logger.info("Wiping MinIO...")
    try:
        response = minio_client.client.list_objects(Bucket=minio_client.bucket_name)
        if "Contents" in response:
            for obj in response["Contents"]:
                minio_client.client.delete_object(Bucket=minio_client.bucket_name, Key=obj["Key"])
        logger.info("MinIO bucket cleared.")
    except Exception as e:
        logger.error(f"Failed to clear MinIO: {e}")

    logger.info("All data wiped successfully.")

if __name__ == "__main__":
    asyncio.run(wipe_all())
