"""
Configuration classes for different environments.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def _fix_db_url(url: str) -> str:
    """
    SQLAlchemy 1.4+ dropped the 'postgres://' dialect alias.
    AWS RDS and some providers still emit it – fix it transparently.
    """
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


class BaseConfig:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    JSON_SORT_KEYS: bool = False
    CORS_ORIGINS: list[str] = ["*"]


class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = _fix_db_url(
        os.getenv(
            "DATABASE_URL",
            f"sqlite:///{BASE_DIR / 'calcpro_dev.db'}",
        )
    )


class TestingConfig(BaseConfig):
    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"


class ProductionConfig(BaseConfig):
    DEBUG: bool = False
    # For Postgres: set DATABASE_URL=postgresql://user:pass@host/dbname
    SQLALCHEMY_DATABASE_URI: str = _fix_db_url(
        os.getenv(
            "DATABASE_URL",
            f"sqlite:///{BASE_DIR / 'calcpro.db'}",
        )
    )
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost").split(",")


config_map: dict = {
    "development": DevelopmentConfig,
    "testing":     TestingConfig,
    "production":  ProductionConfig,
}
