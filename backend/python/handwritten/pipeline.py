from handwritten.extractor import extract_handwritten_prescription
from handwritten.validator import validate_medicines
import json

def process_handwritten(image_path: str):
    print(f"\n📸 Processing: {image_path}")

    # Step 1 — Extract
    print("🔍 Extracting text via Groq Vision...")
    extracted = extract_handwritten_prescription(image_path)
    print(f"✅ Extracted | Confidence: {extracted.get('confidence', '?')}")

    # Step 2 — Validate against India medicine DB
    print("💊 Validating medicines against Indian dataset...")
    validation = validate_medicines(extracted)

    # Step 3 — Merge results
    result = {
        "extracted": extracted,
        "validation": validation
    }

    # Step 4 — Flag low confidence for self-learning
    if float(extracted.get("confidence", 1.0)) < 0.80:
        print("⚠️  Low confidence — flagged for review")
        with open("training/flagged_for_review.jsonl", "a") as f:
            f.write(json.dumps(result) + "\n")

    return result

# Quick test
if __name__ == "__main__":
    result = process_handwritten("sample_prescription.jpg")
    print(json.dumps(result, indent=2))