import os
import base64
import json
from groq import Groq
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
ENV_PATH = os.path.join(BASE_DIR, ".env.txt")

load_dotenv(dotenv_path=ENV_PATH)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def extract_handwritten_groq(image_bytes: bytes, mime: str = "image/jpeg") -> dict:
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{base64_image}"
                        }
                    },
                    {
                        "type": "text",
                        "text": """You are a medical prescription reader.
Extract ALL information from this handwritten prescription image.

Return ONLY a JSON object — no explanation, no markdown:
{
  "patient_name": "",
  "age": "",
  "date": "",
  "doctor_name": "",
  "medicines": [
    {
      "raw_name": "",
      "dosage": "",
      "frequency": "",
      "duration": "",
      "instructions": ""
    }
  ],
  "diagnosis": "",
  "overall_confidence": "high/medium/low"
}

If any field is unreadable, use null.
Set overall_confidence based on handwriting clarity."""
                    }
                ]
            }
        ],
        temperature=0.1,
        max_tokens=1000
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)