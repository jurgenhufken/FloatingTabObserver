import json, time
from pathlib import Path
P = Path.home() / "Documents" / "clipper_active_tab.json"
last = None
while True:
    try:
        raw = json.loads(P.read_text("utf-8"))
        fp = (raw.get('browser',''), raw.get('title',''), raw.get('url',''), raw.get('audible', False))
        if fp != last:
            last = fp
            print("ACTIVE:", raw)
    except FileNotFoundError:
        pass
    time.sleep(0.3)
