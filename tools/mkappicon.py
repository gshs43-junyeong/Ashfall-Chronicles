#!/usr/bin/env python3
"""앱으로 여는 판(desktop/)의 아이콘 — 파비콘 512(play/assets/ui/favicon_512.png, tools/mklogo.py 산출물)에서 굽는다.
   icon.png(창 · 리눅스) · icon.ico(Windows, 16~256) · icon.icns(macOS). 로고를 다시 구웠으면 이것도 다시."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'play', 'assets', 'ui', 'favicon_512.png')
OUT = os.path.join(ROOT, 'desktop')

im = Image.open(SRC).convert('RGBA')
im.save(os.path.join(OUT, 'icon.png'))
im.save(os.path.join(OUT, 'icon.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
im.resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, 'icon.icns'))
print('desktop/icon.png · icon.ico · icon.icns')
