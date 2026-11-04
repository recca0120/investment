---
title: 0009 網站與 Python 共用資料格式：zod → JSON Schema → Pydantic
---

- 日期：2026-11-04
- 對應 issue：#44

## 背景

網站回測器（[0008](0008-browser-backtester.md)）讀的價格、匯率、代號清單、標準答案都是 Python 產生的 JSON。格式原本兩邊各寫一份：Python 用 dict、TypeScript 用手寫的 interface，一邊改了欄位另一邊沒跟上，要到執行時才會發現。使用者提出：「一直靠你去核對不太現實」，要找通用的工具定出同樣的介面。

計算結果是否一致已經由標準答案測試負責（#41-2，CI 自動跑）；這份決定處理的是**格式**。

## 選項（2026-11-04 查詢：GitHub 星數、最近更新、上個月下載量）

兩種語言之間的共通語言是 **JSON Schema**，差別在「從哪裡產生 JSON Schema」：

| 方案 | 做法 | 使用量 | 評估 |
|---|---|---|---|
| **zod** 4.6 | TS 寫 schema → `z.toJSONSchema()`（正式功能）→ datamodel-code-generator 產生 Pydantic | 44k★、13 億／月 | 最多人用、錯誤訊息清楚；多一道轉換，但我們的資料只有簡單欄位 |
| TypeBox | TS 寫的 schema 本身就是 JSON Schema | 7k★；舊套件 `@sinclair/typebox` 4.6 億／月、新套件 `typebox` 5 千萬／月 | 最忠實，但正在換套件名稱 |
| Pydantic 當來源 | Python → JSON Schema → TS 型別（json-schema-to-typescript）＋驗證（Ajv） | Pydantic 29k★、8.4 億／月 | 合理，但 TS 要兩個工具 |
| Valibot、ArkType | 類似 zod | 9k★、7.9k★ | 跨語言能力沒有比 zod 好 |
| TypeSpec | 另一種描述介面的語言 | 5.9k★、114 萬／月 | 要多學一種語言 |
| Protocol Buffers | 跨語言二進位格式 | 72k★ | 為 gRPC 設計，對靜態 JSON 太重 |
| quicktype | 從 JSON 範例反推型別 | 13.9k★ | 是猜出來的，不能當正式定義 |

反方向（JSON Schema → zod）：`z.fromJSONSchema()` 官方標示實驗性、json-schema-to-zod 已封存，所以不從 JSON Schema 產生 zod。

## 決定

```
site/lib/schemas.ts（zod，唯一來源）
   │  npm run schemas（scripts/generate-schemas.ts：z.toJSONSchema）
   ▼
schemas/*.schema.json（進 git）
   │  scripts/generate_models.py（datamodel-code-generator）
   ▼
src/invest/schemas/*.py（Pydantic v2，自動產生，不要手改）
```

- **Python 寫出資料前用 Pydantic 驗證**：格式不符直接報錯，不會寫出壞檔案
- **網頁讀資料時用 zod 驗證**：資料壞掉時丟出指出欄位的錯誤，不拿壞資料計算
- **測試檢查兩邊和 zod 同步**：zod 改了卻沒重新產生，測試失敗
- 先套用在價格、匯率、代號清單、標準答案；之後的持股追蹤、比較器照同樣方式

## 一併評估、這次不決定的事

- **網頁框架（FastAPI 等）**：目前不需要。網站是靜態檔案、計算在瀏覽器（0008），本機工具用 Streamlit。需要伺服器時（例如自己架服務在手機看持股、或要藏 FinMind token）再評估；屆時 FastAPI（10 萬★、3.8 億／月，以 Pydantic 為基礎）是第一候選
- **資料庫**：回測用的公開價格用 JSON 就夠。做持股追蹤（#6）時再決定，候選是 SQLite＋SQLAlchemy 2.1（3.3 億／月，成熟）或 SQLModel（0.0.48，尚未 1.0）；大量價格分析可考慮 DuckDB

## 資料來源

- [Zod：JSON Schema](https://zod.dev/json-schema)
- [datamodel-code-generator](https://github.com/koxudaxi/datamodel-code-generator)
- [Pydantic](https://github.com/pydantic/pydantic)、[TypeBox](https://github.com/sinclairzx81/typebox)、[Valibot](https://github.com/open-circle/valibot)、[ArkType](https://github.com/arktypeio/arktype)、[TypeSpec](https://github.com/microsoft/typespec)、[quicktype](https://github.com/glideapps/quicktype)
- [FastAPI](https://github.com/fastapi/fastapi)、[SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy)、[SQLModel](https://github.com/fastapi/sqlmodel)、[DuckDB](https://github.com/duckdb/duckdb)
