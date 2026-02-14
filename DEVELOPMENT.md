# Developer Guide - Troubleshooting

## Common Issues and Solutions

### Issue: Code changes not taking effect

**Symptoms:**
- Modified Python code but server still runs old version
- Changes to agent nodes (fit_check, scoring, etc.) not working
- Seeing old behavior after code updates

**Cause:** Python bytecode cache (`__pycache__` directories) serving stale compiled code

**Solution:**

#### Option 1: Run the cache clearing script

**Linux/Mac:**
```bash
cd backend
./clear_cache.sh
```

**Windows:**
```cmd
cd backend
clear_cache.bat
```

#### Option 2: Manual cleanup

**Linux/Mac:**
```bash
# From backend directory
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete
```

**Windows (PowerShell):**
```powershell
# From backend directory
Get-ChildItem -Path . -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
Get-ChildItem -Path . -Recurse -File -Filter "*.pyc" | Remove-Item -Force
```

**Windows (Command Prompt):**
```cmd
for /d /r . %d in (__pycache__) do @if exist "%d" rd /s /q "%d"
del /s /q *.pyc
```

#### Option 3: Restart with cache clear

**Linux/Mac:**
```bash
# Stop your uvicorn server (Ctrl+C)
# Clear cache
./clear_cache.sh
# Restart server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Windows:**
```cmd
REM Stop your uvicorn server (Ctrl+C)
REM Clear cache
clear_cache.bat
REM Restart server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### When to clear cache:

✅ **Clear cache when:**
- Pulling new code from git that modifies Python files
- Switching between branches with different Python code
- Code changes not appearing despite server reload
- After major refactoring or file moves

❌ **No need to clear when:**
- Only frontend (React) changes
- Only editing .env or config values
- Adding new files (not modifying existing ones)

### Prevention:

The `.gitignore` file already excludes `__pycache__/` and `*.pyc` files, so:
- ✅ Cache files won't be committed to git
- ✅ Other developers won't get your cache
- ⚠️ But each developer generates their own cache

### Why this happens:

Python compiles `.py` files to `.pyc` bytecode for faster loading. Sometimes this cache becomes stale when:
1. File is modified but timestamp isn't updated properly
2. Hot reload (uvicorn --reload) doesn't catch deep imports
3. Cache is generated before code is fully updated

### Quick Commands Reference:

**Linux/Mac:**
```bash
# Clear Python cache
./backend/clear_cache.sh

# Or manually:
find backend -name "*.pyc" -delete
find backend -name "__pycache__" -type d -exec rm -rf {} +

# Force Python to not create cache (development only, slower)
PYTHONDONTWRITEBYTECODE=1 python -m uvicorn main:app --reload

# Check for cache files
find backend -name "*.pyc" -o -name "__pycache__"
```

**Windows:**
```cmd
REM Clear Python cache
cd backend
clear_cache.bat

REM Or manually (PowerShell):
Get-ChildItem -Path backend -Recurse -Filter "*.pyc" | Remove-Item -Force
Get-ChildItem -Path backend -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force

REM Force Python to not create cache (development only, slower)
set PYTHONDONTWRITEBYTECODE=1
python -m uvicorn main:app --reload

REM Check for cache files (PowerShell)
Get-ChildItem -Path backend -Recurse -Filter "*.pyc"
Get-ChildItem -Path backend -Recurse -Directory -Filter "__pycache__"
```

---

## Other Common Issues

### Issue: Database migration errors

If you see enum errors or column mismatch:

```bash
cd backend
python check_db.py  # Check database schema
```

### Issue: Import errors after git pull

```bash
# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Reinstall dependencies
cd backend
pip install -r requirements.txt
```

### Issue: Frontend not updating

**Linux/Mac:**
```bash
cd frontend
rm -rf node_modules/.vite  # Clear Vite cache
npm run dev  # Restart dev server
```

**Windows:**
```cmd
cd frontend
rmdir /s /q node_modules\.vite  REM Clear Vite cache
npm run dev  REM Restart dev server
```
