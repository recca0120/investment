"""Composition root：唯一負責「組裝真實依賴」的地方。

- 產品程式碼（use case）只依賴 Protocol，透過參數接收依賴
- 只有最外層（Streamlit 畫面、CLI）呼叫 get_container() 取得組裝好的依賴
- 測試用 override() 換成假的依賴
- 依賴變多、組裝變複雜時，再換成 DI container 套件；對外介面維持 get_container()／override()
"""
from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass

from invest.backtest import PriceSource


@dataclass(frozen=True)
class Container:
    prices: PriceSource


def build_container() -> Container:
    raise RuntimeError("真實資料來源尚未實作（見 issue #3）")


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
