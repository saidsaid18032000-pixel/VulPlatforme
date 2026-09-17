from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
import psycopg2.extras

from app.config import settings


@contextmanager
def get_connection() -> Iterator[Any]:
    conn = psycopg2.connect(settings.dsn)
    try:
        yield conn
    finally:
        conn.close()


def fetch_all(sql: str, params: tuple | None = None) -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params or ())
            rows = cur.fetchall()
            return [dict(r) for r in rows]


def fetch_one(sql: str, params: tuple | None = None) -> dict[str, Any] | None:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def scalar(sql: str, params: tuple | None = None) -> int:
    row = fetch_one(sql, params)
    if not row:
        return 0
    return int(next(iter(row.values())) or 0)
