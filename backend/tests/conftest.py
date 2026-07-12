from __future__ import annotations

import os
import shutil
from collections.abc import AsyncIterator
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./data/test_shambalens.db")
os.environ.setdefault("DATABASE_URL_UNPOOLED", "")
os.environ["DEMO_MODE"] = "true"
os.environ["MAX_UPLOAD_MB"] = "1"
os.environ["UPLOAD_DIR"] = "data/test_uploads"
os.environ["ANONYMOUS_TOKEN_SALT"] = "test-only-salt"

import httpx  # noqa: E402
import pytest  # noqa: E402
from sqlalchemy import delete  # noqa: E402

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.db import Base  # noqa: E402
from app.db.models import Assessment  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


def _reset_upload_dir() -> None:
    upload_dir = Path("data/test_uploads")
    shutil.rmtree(upload_dir, ignore_errors=True)
    upload_dir.mkdir(parents=True, exist_ok=True)


@pytest.fixture(autouse=True)
async def clean_database() -> AsyncIterator[None]:
    _reset_upload_dir()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with SessionLocal() as session:
        await session.execute(delete(Assessment))
        await session.commit()
    yield


@pytest.fixture
async def client() -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as value:
        yield value


@pytest.fixture
def token_headers() -> dict[str, str]:
    return {"X-Shamba-Token": "test-browser-token-0001"}
