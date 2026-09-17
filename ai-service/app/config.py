import os


class Settings:
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("POSTGRES_DB", "vulnplatform")
    db_user: str = os.getenv("POSTGRES_USER", "vuln")
    db_password: str = os.getenv("POSTGRES_PASSWORD", "vuln_secret_change_me")
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    cache_ttl_seconds: int = int(os.getenv("AI_CACHE_TTL", "60"))

    @property
    def dsn(self) -> str:
        return (
            f"host={self.db_host} port={self.db_port} dbname={self.db_name} "
            f"user={self.db_user} password={self.db_password}"
        )


settings = Settings()
