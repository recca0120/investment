#!/usr/bin/env python3
"""從 schemas/*.schema.json 產生 Pydantic 模型到 src/invest/schemas/（#44，決策 0009）。

用法：npm run schemas（先從 zod 產生 JSON Schema，再執行這支）
tests/acceptance/test_schemas.py 用同一個 models() 檢查 src/invest/schemas/ 有沒有跟上。
"""
from pathlib import Path

from datamodel_code_generator import DataModelType, InputFileType, PythonVersion, generate
from datamodel_code_generator.format import Formatter

SCHEMAS = Path("schemas")
OUT = Path("src/invest/schemas")
HEADER = "# 自動產生，不要手改：來源 site/lib/schemas.ts（zod）→ schemas/{name}，執行 npm run schemas 重新產生"


def models() -> dict[str, str]:
    """每個 JSON Schema 產生一個模組：price-series.schema.json → price_series.py。"""
    out = {}
    for path in sorted(SCHEMAS.glob("*.schema.json")):
        module = path.name.removesuffix(".schema.json").replace("-", "_") + ".py"
        out[module] = generate(
            path,
            input_file_type=InputFileType.JsonSchema,
            output_model_type=DataModelType.PydanticV2BaseModel,
            target_python_version=PythonVersion.PY_312,
            custom_file_header=HEADER.format(name=path.name),
            use_standard_collections=True,
            use_union_operator=True,
            use_schema_description=True,
            use_field_description=True,
            use_title_as_name=True,  # 用 zod .meta({ title }) 當類別名稱（GoldenInput 而不是 Input）
            disable_timestamp=True,
            # 明確用內建格式化：不受有沒有裝 black／isort 影響，產生的程式碼才穩定（同步測試會逐字比對）
            formatters=[Formatter.BUILTIN],
        )
    out["__init__.py"] = '"""自動產生的 Pydantic 模型（#44）：來源 site/lib/schemas.ts，執行 npm run schemas 重新產生"""\n'
    return out


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.py"):
        old.unlink()
    for module, code in models().items():
        (OUT / module).write_text(code, encoding="utf-8")
        print(OUT / module)
