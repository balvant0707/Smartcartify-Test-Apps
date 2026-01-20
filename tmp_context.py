from pathlib import Path
path = Path('app/routes/app.rules.jsx')
lines = path.read_text(encoding='utf-8').splitlines()
for idx in range(2875, 2895):
    print(f"{idx+1:5}: {lines[idx]}")
