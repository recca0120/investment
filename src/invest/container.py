"""Composition root：唯一負責組裝真實依賴的地方（見 .claude/skills/atdd/references/dependency-injection.md）。"""
from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass

from invest.finmind import FinMindFxSource, FinMindHttpFetch, FinMindPriceSource
from invest.prices import FxSource, PriceSource


@dataclass(frozen=True)
class Container:
    prices: PriceSource
    fx: FxSource


def build_container() -> Container:
    fetch = FinMindHttpFetch(token=os.environ.get("FINMIND_TOKEN"))
    return Container(prices=FinMindPriceSource(fetch), fx=FinMindFxSource(fetch))


_override: Container | None = None


def get_container() -> Container:
    return _override if _override is not None else build_container()


@contextmanager
def override(container: Container) -> Iterator[Container]:
    global _override
    previous, _override = _override, container
    try:
        yield container
    finally:
        _override = previous
