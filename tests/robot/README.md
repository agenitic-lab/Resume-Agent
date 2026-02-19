# Running Robot Framework Tests

This project now includes example automation tests using [Robot Framework](https://robotframework.org/).

## Prerequisites

1.  **Install Robot Framework and libraries:**
    ```bash
    pip install robotframework robotframework-requests robotframework-browser
    ```

2.  **Initialize Browser Library (Playwright):**
    ```bash
    rfbrowser init
    ```

## Running Tests

### 1. API Tests
Ensure your FastAPI backend is running at `http://localhost:8000`.
```bash
robot tests/robot/api_tests.robot
```

### 2. UI Tests
Ensure your Vite frontend is running at `http://localhost:5173`.
```bash
robot tests/robot/ui_tests.robot
```

### 3. All Tests
```bash
robot tests/robot/
```

## Reports
After running tests, Robot Framework generates:
- `report.html`: High-level summary of the test run.
- `log.html`: Detailed execution logs with snapshots and messages.
- `output.xml`: Machine-readable output for CI/CD integration.
