import os
import pandas as pd
from groq import Groq
from dotenv import load_dotenv
import json


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
ENV_PATH = os.path.join(BASE_DIR, ".env.txt")

load_dotenv(dotenv_path=ENV_PATH)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


# Load your India medicine datasets once
df_az     = pd.read_csv("training/A_Z_medicines_dataset_of_India.csv")
df_detail = pd.read_csv("training/Medicine_Details.csv")

# Build medicine name list (adjust column name if different)
INDIA_MEDICINES = df_az.iloc[:, 0].dropna().tolist()

def validate_medicines(extracted: dict) -> dict:
    """
    Takes extracted prescription dict,
    validates medicine names against Indian dataset using Groq.
    """
    medicine_sample = INDIA_MEDICINES[:800]  # keep prompt size reasonable

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""You are an Indian pharmacy validation assistant.

Your job:
1. Match extracted medicine names to the closest valid Indian medicine below
2. Fix OCR/handwriting errors (e.g. "Dolo65O" → "Dolo 650")
3. Flag any dangerous dosage (e.g. too high frequency)
4. Check for obvious drug interactions if multiple medicines

Valid Indian Medicines List:
{medicine_sample}

Return ONLY a JSON object:
{{
  "validated_medicines": [
    {{
      "original_name": "",
      "corrected_name": "",
      "match_confidence": 0.0,
      "dosage_safe": true,
      "flag": ""
    }}
  ],
  "interactions_warning": "",
  "overall_safe": true
}}"""
            },
            {
                "role": "user",
                "content": f"Validate these medicines: {json.dumps(extracted.get('medicines', []))}"
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.1
    )

    return json.loads(response.choices[0].message.content)