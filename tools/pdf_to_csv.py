#!/usr/bin/env python3
"""公式の取扱店舗一覧PDF → data/stores.csv

使い方:
    pip install pdfplumber
    python3 tools/pdf_to_csv.py shoplist.pdf data/stores.csv

店舗リストが更新されたら、新しいPDFでこれを実行して stores.csv を差し替え、
GitHub に push すれば位置データの再生成と公開が自動で行われます。
"""
import csv
import sys
import unicodedata

import pdfplumber


def main(src: str, dst: str) -> None:
    rows = []
    with pdfplumber.open(src) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for r in table:
                    if not r or len(r) < 4:
                        continue
                    r = [(c or "").replace("\n", "").strip() for c in r[:4]]
                    if r[0] in ("", "店舗名"):
                        continue
                    rows.append(r)
    with open(dst, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "name", "pref", "address", "tel"])
        for i, (name, pref, addr, tel) in enumerate(rows, 1):
            w.writerow([
                f"s{i:04d}",
                unicodedata.normalize("NFKC", name).strip(),
                pref,
                addr,
                unicodedata.normalize("NFKC", tel).strip(),
            ])
    print(f"{len(rows)} 店舗を書き出しました → {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: pdf_to_csv.py <shoplist.pdf> <stores.csv>")
    main(sys.argv[1], sys.argv[2])
