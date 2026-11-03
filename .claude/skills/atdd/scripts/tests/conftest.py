def pytest_configure(config):
    # 和專案的 pyproject.toml 相同：@pytest.mark.criteria 標記對應的 issue 驗收條件
    config.addinivalue_line("markers", "criteria(id): 對應 issue 的驗收條件編號，例如 #5-1")
