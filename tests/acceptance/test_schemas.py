"""驗收測試：網站與 Python 共用資料格式（issue #44，決策 0009）"""
import importlib.util
from datetime import date
from pathlib import Path

import pytest
from pydantic import ValidationError

from invest.export import export_series, validated
from invest.schemas.price_series import PriceSeries
from tests.fakes.prices import FakePriceSource

ROOT = Path(__file__).parents[2]


def _generator():
    spec = importlib.util.spec_from_file_location("generate_models", ROOT / "scripts/generate_models.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.criteria("#44-1")
def test_Pydantic模型和JSON_Schema同步(monkeypatch):
    monkeypatch.chdir(ROOT)
    expected = _generator().models()
    committed = {p.name: p.read_text(encoding="utf-8") for p in (ROOT / "src/invest/schemas").glob("*.py")}
    assert committed.keys() == expected.keys()
    for name, code in expected.items():
        assert committed[name] == code, f"{name} 沒有跟上 schemas/：執行 npm run schemas"


@pytest.mark.criteria("#44-2")
def test_匯出前驗證格式_不符就報錯():
    good = {"symbol": "VT", "currency": "USD", "dates": ["2025-01-02"], "close": [100.0], "total": [100.0]}
    assert validated(PriceSeries, good) == good

    with pytest.raises(ValidationError, match="currency"):
        validated(PriceSeries, {**good, "currency": "JPY"})
    with pytest.raises(ValidationError, match="dates"):
        validated(PriceSeries, {**good, "dates": ["2025/01/02"]})
    with pytest.raises(ValidationError, match="unexpected|extra"):
        validated(PriceSeries, {**good, "volume": [1]})


@pytest.mark.criteria("#44-2")
def test_匯出的價格資料符合格式():
    prices = FakePriceSource({"VT": [(date(2025, 1, 2), 100.0, 98.0), (date(2025, 6, 2), 100.0, 100.0)]})
    out = export_series(prices, "VT", date(2025, 1, 1), date(2025, 12, 31))
    assert PriceSeries.model_validate(out).symbol == "VT"


@pytest.mark.criteria("#44-2")
def test_明確給null的欄位要保留_沒給的選填欄位不輸出():
    # 實際踩過：用 exclude_none 時，還沒回本的 recovered: null 被拿掉，網頁的驗證失敗
    from invest.schemas.backtest_golden import BacktestGolden

    case = {
        "input": {"symbol": "BND", "monthly": 2000, "start": "2018-06-01", "end": "2023-06-30",
                  "dividends": True, "twd": True, "tax": True},
        "expected": {"totalInvested": 1.0, "finalValue": 1.0, "annualized": 0.0, "maxDrawdown": 0.0, "days": 1,
                     "worst": {"date": "2022-10-20", "invested": 1.0, "value": 0.9, "recovered": None}},
    }
    assert validated(BacktestGolden, [case])[0]["expected"]["worst"]["recovered"] is None
    tw = {"symbol": "0050", "currency": "TWD", "dates": ["2025-01-02"], "close": [1.0], "total": [1.0]}
    assert "totalTaxed" not in validated(PriceSeries, tw)
