from pathlib import Path
path=Path('app/routes/app.rules.jsx')
text=path.read_text(encoding='utf-8').splitlines()
for idx in range(2900,2955):
    print(f"{idx+1:5}: {text[idx]}")
