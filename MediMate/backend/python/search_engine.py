import json
import os

BASE_DIR = os.path.dirname(__file__)

# Load JSON
json_path = os.path.join(BASE_DIR, "data", "medicine_details.json")

with open(json_path, encoding="utf-8") as f:
    json_data = json.load(f)


def clean_query(user_input):
    user_input = user_input.lower()
    stop_words = ["give", "me", "info", "of", "about", "the", "medicine"]
    words = [w for w in user_input.split() if w not in stop_words]
    return words[0] if words else user_input


def safe(value):
    return value if value else "Not available"


def search_medicine(user_input):
    query = clean_query(user_input)

    # EXACT MATCH
    if query in json_data:
        med = json_data[query]

        return {
            "found": True,
            "name": safe(med.get("name")),
            "uses": safe(med.get("uses")),
            "dosage": safe(med.get("dosage")),
            "when_to_take": safe(med.get("when_to_take")),
            "side_effects": safe(med.get("side_effects")),
            "precautions": safe(med.get("precautions")),
            "description": safe(med.get("description")),
            "confidence": 100
        }

    # VALUE MATCH
    for key, value in json_data.items():
        name_words = value.get("name", "").lower().split()

        if query in name_words:
            return {
                "found": True,
                "name": safe(value.get("name")),
                "uses": safe(value.get("uses")),
                "dosage": safe(value.get("dosage")),
                "when_to_take": safe(value.get("when_to_take")),
                "side_effects": safe(value.get("side_effects")),
                "precautions": safe(value.get("precautions")),
                "description": safe(value.get("description")),
                "confidence": 95
            }

    return {
        "found": False,
        "message": "Medicine not found"
    }