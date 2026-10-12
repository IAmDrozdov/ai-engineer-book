#!/usr/bin/env python3
"""Печатает связный текст главы без разметки: по абзацу на строку с id раздела и номером строки HTML."""
import re, sys, html
from pathlib import Path

def main(path):
    p = Path(path)
    if p.is_dir():
        p = p / 'index.html'
    src = p.read_text(encoding='utf-8')
    src = re.sub(r'<script[^>]*>.*?</script>', '', src, flags=re.S)
    src = re.sub(r'<svg[^>]*>.*?</svg>', '', src, flags=re.S)
    section = ''
    for m in re.finditer(r'<section[^>]*id="([^"]+)"|<(p|li|h1|h2|h3|h4|figcaption|summary|dt|dd|td|th)\b[^>]*>(.*?)</\2>', src, flags=re.S):
        if m.group(1):
            section = m.group(1)
            continue
        text = html.unescape(re.sub(r'<[^>]+>', '', m.group(3))).strip()
        text = re.sub(r'\s+', ' ', text)
        if len(text) < 2:
            continue
        line = src.count('\n', 0, m.start()) + 1
        print(f'{p.parent.name}:{line} [{section}] <{m.group(2)}> {text}')

if __name__ == '__main__':
    for arg in sys.argv[1:]:
        main(arg)
