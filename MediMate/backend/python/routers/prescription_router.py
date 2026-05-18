import json
import os
import uuid
from io import BytesIO
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse

from medicine_engine import match_medicine
from pdf_reader import extract_from_pdf

import psycopg2
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env.txt"))

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_to_db(user_id: int, original_filename: str, saved_filename: str, file_type: str, result: dict):
    try:
        if not user_id: 
            print("⚠ Guest user detected — skipping DB save") 
            return None
        print(f"🔄 Saving prescription for user_id={user_id}, original={original_filename}, stored={saved_filename}")

        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "medimate_db"),
            user=os.getenv("DB_USER", "mediuser"),
            password=os.getenv("DB_PASSWORD", "mediuser123"),
            port=int(os.getenv("DB_PORT", 5433))
        )

        cur = conn.cursor()

        # medicines as TEXT[] - filter out empty names
        medicines_list = [m.get("name", "") for m in result.get("medicines", []) if m.get("name")]

        cur.execute(
            """INSERT INTO prescriptions 
               (user_id, original_name, stored_filename, file_type,
                patient_name, doctor, date, medicines, raw_result, upload_date, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), 'active')
               RETURNING id""",
            (
                user_id,
                original_filename,
                saved_filename,
                file_type,
                result.get("patient_name") or None,
                result.get("doctor_name") or None,
                None,
                medicines_list,
                json.dumps(result)
            )
        )

        prescription_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        print(f"✅ Saved prescription ID: {prescription_id}")
        return prescription_id

    except Exception as e:
        print(f"❌ DB Save Error: {e}")
        import traceback
        traceback.print_exc()
        return None


# ─────────────────────────────────────────────
# ROUTE 1: PDF PRESCRIPTION
# ─────────────────────────────────────────────
@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: int = Form(None)
):
    try:
        print(f"📄 Processing PDF: {file.filename}")
        contents = await file.read()
        pdf_io = BytesIO(contents)
        extracted = extract_from_pdf(pdf_io)
        matched_medicines = []

        for med in extracted.get("raw_medicines", []):
            result = match_medicine(med.get("raw_name", ""))
            if result:
                matched_medicines.append({
                    "name": result.get("name"),
                    "dosage": med.get("dosage"),
                    "frequency": med.get("frequency"),
                    "duration": med.get("duration"),
                    "uses": result.get("uses", "Not available"),
                    "side_effects": result.get("side_effects", "Not available"),
                    "confidence": result.get("confidence", 0),
                    "source": result.get("source", "unknown")
                })
            else:
                matched_medicines.append({
                    "name": med.get("raw_name"),
                    "dosage": med.get("dosage"),
                    "frequency": med.get("frequency"),
                    "duration": med.get("duration"),
                    "uses": "Not available",
                    "side_effects": "Not available",
                    "confidence": 0,
                    "source": "not_found"
                })

        saved_filename = f"{uuid.uuid4()}.pdf"
        with open(os.path.join(UPLOAD_DIR, saved_filename), "wb") as f:
            f.write(contents)

        final_result = {
            "status": "success",
            "patient_name": extracted.get("patient_name", "Not Found"),
            "age": extracted.get("age", ""),
            "date": extracted.get("date", ""),
            "doctor_name": extracted.get("doctor_name", ""),
            "diagnosis": extracted.get("diagnosis", ""),
            "medicines": matched_medicines,
            "original_filename": file.filename
        }

        save_to_db(user_id, file.filename, saved_filename, file.content_type, final_result)
        return JSONResponse(content=final_result)

    except Exception as e:
        print(f"❌ PDF Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")


# ─────────────────────────────────────────────
# ROUTE 2: IMAGE PRESCRIPTION
# ─────────────────────────────────────────────
@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    user_id: int = Form(None)
):
    try:
        print(f"🖼️ Processing Image: {file.filename}, user_id={user_id}")

        image_bytes = await file.read()
        mime = file.content_type or ("image/png" if file.filename.lower().endswith(".png") else "image/jpeg")

        # Save image to disk with UUID name
        ext = "png" if file.filename.lower().endswith(".png") else "jpg"
        saved_filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)
        with open(file_path, "wb") as f:
            f.write(image_bytes)
        print(f"💾 Image saved: {file_path}")

        # Extract using Groq
        extracted = None
        try:
            from handwritten.groq_extractor import extract_handwritten_groq
            extracted = extract_handwritten_groq(image_bytes, mime)
            print(f"🤖 Groq extraction: confidence={extracted.get('overall_confidence')}")
        except Exception as e:
            print(f"⚠️ Groq extraction error: {e}")
            extracted = None

        # ✅ FIX: Save to DB even on low confidence or extraction failure
        # This ensures prescription always appears in history
        if extracted is None or extracted.get("overall_confidence") == "low":
            print(f"⚠️ Low/failed confidence — saving to DB anyway so it shows in history")
            save_to_db(user_id, file.filename, saved_filename, mime, {
                "medicines": [],
                "patient_name": "",
                "doctor_name": "",
            })
            return JSONResponse(content={
                "status": "low_confidence",
                "message": "Prescription unclear, please retake image",
                "data": extracted or {}
            })

        # Match medicines
        matched_medicines = []
        for med in extracted.get("medicines", []):
            name_to_match = med.get("corrected_name") or med.get("raw_name", "")
            result = match_medicine(name_to_match) if name_to_match else None

            if result:
                matched_medicines.append({
                    "name": result.get("name"),
                    "dosage": med.get("dosage", ""),
                    "frequency": med.get("frequency", ""),
                    "duration": med.get("duration", ""),
                    "instruction": med.get("instructions") or med.get("instruction", ""),
                    "uses": result.get("uses", "Not available"),
                    "side_effects": result.get("side_effects", "Not available"),
                    "confidence": result.get("confidence", 0),
                    "source": result.get("source", "unknown")
                })
            else:
                matched_medicines.append({
                    "name": name_to_match or "Unknown Medicine",
                    "dosage": med.get("dosage", ""),
                    "frequency": med.get("frequency", ""),
                    "duration": med.get("duration", ""),
                    "instruction": med.get("instructions") or med.get("instruction", ""),
                    "uses": "Not available",
                    "side_effects": "Not available",
                    "confidence": 0,
                    "source": "not_found"
                })

        # Flag medium confidence for review
        if extracted.get("overall_confidence") == "medium":
            flag_path = os.path.join(BASE_DIR, "training", "flagged_for_review.jsonl")
            os.makedirs(os.path.dirname(flag_path), exist_ok=True)
            with open(flag_path, "a") as f:
                f.write(json.dumps({
                    "extracted": extracted,
                    "matched": matched_medicines
                }) + "\n")

        final_result = {
            "status": "success",
            "patient_name": extracted.get("patient_name", ""),
            "age": extracted.get("age", ""),
            "date": extracted.get("date", ""),
            "doctor_name": extracted.get("doctor_name", ""),
            "diagnosis": extracted.get("diagnosis", ""),
            "medicines": matched_medicines,
            "overall_confidence": extracted.get("overall_confidence", "high"),
            "original_filename": file.filename
        }

        save_to_db(user_id, file.filename, saved_filename, file.content_type, final_result)

        print(f"✅ Done. {len(matched_medicines)} medicines found.")
        return JSONResponse(content=final_result)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid response format: {str(e)}")
    except Exception as e:
        print(f"❌ Image Upload Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


# ─────────────────────────────────────────────
# ROUTE 3: SERVE UPLOADED IMAGES
# ─────────────────────────────────────────────
@router.get("/image/{filename}")
async def get_image(filename: str):
    image_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(image_path):
        return FileResponse(image_path)
    raise HTTPException(status_code=404, detail=f"Image not found: {filename}")


# ─────────────────────────────────────────────
# ROUTE 4: TEST ENDPOINT
# ─────────────────────────────────────────────
@router.get("/test")
async def test_endpoint():
    return {"status": "ok", "message": "Prescription router is working"}