import os
import re
import json
import pandas as pd

# BASE_DIR = r"D:\MediMate\backend\python"
# CSV_PATH  = os.path.join(BASE_DIR, "data", "A_Z_medicines_dataset_of_India.csv")
# OUT_PATH  = os.path.join(BASE_DIR, "data", "composition_lookup.json")

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR  = os.path.join(BASE_DIR, '..', 'python')
CSV_PATH    = os.path.join(BASE_DIR, 'A_Z_medicines_dataset_of_India.csv')
OUT_PATH    = os.path.join(OUTPUT_DIR, 'data', 'composition_lookup.json')


def clean_composition(comp: str) -> str:
    if not comp or str(comp).lower() == 'nan':
        return ''
    return re.sub(r"\s*\(.*?\)", "", str(comp)).strip()


def build():
    print("Loading A-Z dataset...")
    az = pd.read_csv(CSV_PATH)

    lookup = {}
    for _, row in az.iterrows():
        key = str(row["name"]).strip().lower()
        c1  = clean_composition(row.get("short_composition1", ""))
        c2  = clean_composition(row.get("short_composition2", ""))
        composition = f"{c1} {c2}".strip() if c2 else c1
        if composition:
            lookup[key] = composition

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(lookup, f)

    print(f"Saved {len(lookup)} entries → {OUT_PATH}")


if __name__ == "__main__":
    build()