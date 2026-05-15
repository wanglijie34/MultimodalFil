from functools import lru_cache
from os import getenv


class Settings:
    app_name = "MultimodalFile Backend"
    app_env = getenv("APP_ENV", "development")
    postgres_dsn = (
        f"postgresql+psycopg://{getenv('POSTGRES_USER', 'root')}:"
        f"{getenv('POSTGRES_PASSWORD', '123456')}@"
        f"{getenv('POSTGRES_HOST', 'postgres')}:"
        f"{getenv('POSTGRES_PORT', '5432')}/"
        f"{getenv('POSTGRES_DB', 'multimodal_app')}"
    )
    redis_url = (
        f"redis://:{getenv('REDIS_PASSWORD', '123456')}@"
        f"{getenv('REDIS_HOST', 'redis')}:"
        f"{getenv('REDIS_PORT', '6379')}/0"
    )
    minio_endpoint = getenv("S3_ENDPOINT", "http://minio:9000")
    minio_access_key = getenv("S3_ACCESS_KEY", "root")
    minio_secret_key = getenv("S3_SECRET_KEY", "12345678")
    neo4j_uri = getenv("NEO4J_URI", "bolt://neo4j:7687")
    neo4j_username = getenv("NEO4J_USERNAME", "neo4j")
    neo4j_password = getenv("NEO4J_PASSWORD", "123456")
    qdrant_url = getenv("QDRANT_URL", "http://qdrant:6333")
    qdrant_api_key = getenv("QDRANT_API_KEY", "123456")
    qdrant_collection = getenv("QDRANT_COLLECTION", "multimodal_knowledge")
    milvus_uri = getenv("MILVUS_URI", "http://milvus-standalone:19530")


@lru_cache
def get_settings() -> Settings:
    return Settings()
