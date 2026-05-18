import os
import json
import pandas as pd

# BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
# CSV_PATH     = os.path.join(BASE_DIR, "data", "Medicine_Details.csv")
# OUTPUT_PATH  = os.path.join(BASE_DIR, "data", "medicine_details.json")

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR  = os.path.join(BASE_DIR, '..', 'python')
CSV_PATH    = os.path.join(BASE_DIR, 'Medicine_Details.csv')
OUTPUT_PATH = os.path.join(OUTPUT_DIR, 'data', 'medicine_details.json')


def build():
    print("Loading Medicine Details dataset...")
    md = pd.read_csv(CSV_PATH)
    md = md[["Medicine Name", "Uses", "Side_effects"]].dropna(subset=["Medicine Name"])

    details = {}
    for _, row in md.iterrows():
        key = str(row["Medicine Name"]).strip().lower()
        details[key] = {
            "name":         str(row["Medicine Name"]).strip(),
            "uses":         str(row["Uses"]).strip()         if pd.notna(row["Uses"])         else "",
            "side_effects": str(row["Side_effects"]).strip() if pd.notna(row["Side_effects"]) else "",
        }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(details, f, indent=2)

    print(f"Saved {len(details)} entries → {OUTPUT_PATH}")


if __name__ == "__main__":
    build()