import os
import base64
import json
from groq import Groq
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
ENV_PATH = os.path.join(BASE_DIR, ".env.txt")

load_dotenv(dotenv_path=ENV_PATH)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def encode_image(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def extract_handwritten_prescription(image_path: str) -> dict:
    """
    Takes a handwritten prescription image path,
    returns structured JSON using Groq Vision.
    """
    base64_image = encode_image(image_path)

    # detect extension
    ext = image_path.split(".")[-1].lower()
    mime = "image/png" if ext == "png" else "image/jpeg"

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

Return ONLY a JSON object with this structure:
{
  "patient": {
    "name": "",
    "age": "",
    "gender": ""
  },
  "doctor": {
    "name": "",
    "clinic": ""
  },
  "date": "",
  "medicines": [
    {
      "name": "",
      "dosage": "",
      "frequency": "",
      "duration": "",
      "instructions": ""
    }
  ],
  "diagnosis": "",
  "notes": "",
  "confidence": 0.0
}

If any field is unreadable, use null.
Set confidence (0.0 to 1.0) based on overall readability."""
                    }
                ]
            }
        ],
        temperature=0.1,   # low temp = more consistent extraction
        max_tokens=1000
    )

    raw = response.choices[0].message.content

    # clean and parse JSON
    raw = raw.strip().replace("```json", "").replace("```", "")
    return json.loads(raw)