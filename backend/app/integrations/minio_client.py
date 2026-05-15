import boto3
from botocore.client import Config
from app.core.config import settings
from loguru import logger

class MinIOClient:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=f"http://{settings.MINIO_ENDPOINT}" if not settings.MINIO_SECURE else f"https://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_key_id=settings.MINIO_SECRET_KEY,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1", # MinIO usually doesn't care
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except:
            logger.info(f"Creating bucket {self.bucket_name}")
            self.client.create_bucket(Bucket=self.bucket_name)

    def upload_file(self, file_data, object_name: str, content_type: str = None):
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=object_name,
            Body=file_data,
            **extra_args
        )
        return object_name

    def download_file(self, object_name: str):
        response = self.client.get_object(Bucket=self.bucket_name, Key=object_name)
        return response["Body"].read()

    def delete_file(self, object_name: str):
        self.client.delete_object(Bucket=self.bucket_name, Key=object_name)

    def get_presigned_url(self, object_name: str, expires_in: int = 3600):
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": object_name},
            ExpiresIn=expires_in,
        )

minio_client = MinIOClient()
