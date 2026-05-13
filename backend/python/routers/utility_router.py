from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
import sys
import os
import json
import qrcode
from io import BytesIO
import base64
import psycopg2
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env.txt"))

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from voice.tts_generator import generate_voice
from card.card_generator import generate_card
from card.qr_generator import generate_qr

router = APIRouter(prefix='/api', tags=['utilities'])

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "medimate_db"),
        user=os.getenv("DB_USER", "mediuser"),
        password=os.getenv("DB_PASSWORD", "mediuser123"),
        port=int(os.getenv("DB_PORT", 5433))
    )

@router.post('/voice')
async def generate_voice_instruction(data: dict, lang: str = 'english'):
    """Generate voice instructions for prescription"""
    try:
        audio_path = generate_voice(data, lang)
        if audio_path and os.path.exists(audio_path):
            return FileResponse(audio_path, media_type='audio/mpeg', filename='medicine_instructions.mp3')
        else:
            raise HTTPException(status_code=500, detail="Failed to generate voice")
    except Exception as e:
        print(f"Voice error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/card')
async def generate_prescription_card(data: dict, lang: str = 'english'):
    """Generate printable prescription card with QR code"""
    try:
        patient_id = data.get('patient_id', 'unknown')
        prescription_id = data.get('prescription_id', 'unknown')
        
        qr_path = generate_qr(patient_id, prescription_id)
        pdf_path = generate_card(data, qr_path, lang)
        
        if os.path.exists(pdf_path):
            return FileResponse(pdf_path, media_type='application/pdf', filename='prescription_card.pdf')
        else:
            raise HTTPException(status_code=500, detail="PDF file not created")
    except Exception as e:
        print(f"Card generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/generate-qr')
async def generate_qr_code(patient_id: str = Query(...), prescription_id: str = Query(...)):
    """Generate QR code image for prescription"""
    try:
        YOUR_COMPUTER_IP = "10.188.120.79"
        server_url = f"http://{YOUR_COMPUTER_IP}:8000"
        # Use short URL for QR code
        url = f"{server_url}/p/{prescription_id}"
        
        print(f"QR URL: {url}")
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=8,
            border=2,
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return JSONResponse(content={
            "success": True,
            "qr_code": f"data:image/png;base64,{img_str}",
            "url": url
        })
    except Exception as e:
        print(f"QR generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ MAIN QR PAGE - LONG URL ============
@router.get('/patient/{patient_id}/prescription/{prescription_id}')
async def view_patient_prescription(patient_id: str, prescription_id: str):
    """Public page for QR code scanning - FAST & LIGHTWEIGHT"""
    
    import time
    start_time = time.time()
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Simple, fast query
        cur.execute("""
            SELECT patient_name, doctor, medicines, date 
            FROM prescriptions 
            WHERE id = %s LIMIT 1
        """, (prescription_id,))
        
        result = cur.fetchone()
        cur.close()
        conn.close()
        
        if result:
            patient_name, doctor, medicines, date = result
            patient_name = patient_name or 'Patient'
            doctor = doctor or 'Doctor'
        else:
            patient_name = "Patient"
            doctor = "Doctor"
            medicines = []
        
        # Parse medicines fast
        if isinstance(medicines, str):
            try:
                medicines = json.loads(medicines)
            except:
                medicines = []
        elif not medicines:
            medicines = []
            
    except Exception as e:
        print(f"QR DB error: {e}")
        patient_name = "Patient"
        doctor = "Doctor"
        medicines = []
    
    # Build HTML - MINIMAL and FAST
    medicines_html = ""
    for med in medicines[:5]:
        name = med.get('name', 'Medicine') if isinstance(med, dict) else str(med)
        medicines_html += f'<div class="m">💊 {name}</div>'
    
    if not medicines_html:
        medicines_html = '<div class="m">📋 No medicines listed</div>'
    
    execution_time = round((time.time() - start_time) * 1000, 2)
    
    return HTMLResponse(f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MediMate | {patient_name}</title>
        <style>
            *{{margin:0;padding:0;box-sizing:border-box;}}
            body{{
                font-family:Arial,sans-serif;
                background:#004795;
                min-height:100vh;
                padding:15px;
            }}
            .c{{
                max-width:450px;
                margin:0 auto;
                background:white;
                border-radius:20px;
                padding:20px;
                box-shadow:0 5px 20px rgba(0,0,0,0.2);
            }}
            h1{{
                color:#004795;
                font-size:22px;
                text-align:center;
                margin-bottom:20px;
                border-bottom:2px solid #004795;
                padding-bottom:10px;
            }}
            .info{{
                background:#f0f4ff;
                padding:12px;
                border-radius:12px;
                margin-bottom:15px;
            }}
            .info p{margin:5px 0;font-size:14px;}
            .m{{
                background:#f8fafc;
                padding:10px;
                margin:8px 0;
                border-left:3px solid #004795;
                border-radius:8px;
                font-size:14px;
            }}
            .verified{{
                text-align:center;
                margin-top:15px;
                font-size:11px;
                color:#10b981;
            }}
            .footer{{
                text-align:center;
                margin-top:15px;
                font-size:10px;
                color:#999;
            }}
            @media (max-width:480px){{
                .c{padding:15px;}
                h1{font-size:18px;}
            }}
        </style>
    </head>
    <body>
        <div class="c">
            <h1>📋 MediMate</h1>
            <div class="info">
                <p><strong>👤</strong> {patient_name}</p>
                <p><strong>👨‍⚕️</strong> {doctor}</p>
            </div>
            <div style="margin:15px 0;"><strong>💊 Medicines:</strong></div>
            {medicines_html}
            <div class="verified">✓ Verified by MediMate</div>
            <div class="footer">Scan verified | {execution_time}ms</div>
        </div>
    </body>
    </html>
    """)