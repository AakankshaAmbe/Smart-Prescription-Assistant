from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import json
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env.txt"))

from routers.prescription_router import router as prescription_router
from routers.search_router import router as search_router
from routers.utility_router import router as utility_router

app = FastAPI()

# ✅ CORS FIX
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ ROUTES
app.include_router(prescription_router, prefix="/prescription")
app.include_router(search_router)

app.include_router(utility_router)

# ============ SHORT URL ROUTE FOR QR CODE ============
@app.get('/p/{prescription_id}')
async def quick_prescription(prescription_id: str):
    """Short URL for faster QR access - Shows all medicine details"""
    import time
    start_time = time.time()
    
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "medimate_db"),
            user=os.getenv("DB_USER", "mediuser"),
            password=os.getenv("DB_PASSWORD", "mediuser123"),
            port=int(os.getenv("DB_PORT", 5433))
        )
        cur = conn.cursor()
        
        # Query the medicines_json column
        cur.execute("""
            SELECT patient_name, doctor, medicines_json 
            FROM prescriptions 
            WHERE id = %s LIMIT 1
        """, (prescription_id,))
        
        result = cur.fetchone()
        cur.close()
        conn.close()
        
        if result:
            patient_name, doctor, medicines_data = result
            patient_name = patient_name or 'Patient'
            doctor = doctor or 'Doctor'
            
            # Parse medicines_json
            if medicines_data:
                if isinstance(medicines_data, str):
                    medicines = json.loads(medicines_data)
                else:
                    medicines = medicines_data if isinstance(medicines_data, list) else []
            else:
                medicines = []
        else:
            patient_name = "Patient Not Found"
            doctor = "Doctor"
            medicines = []
            
    except Exception as e:
        print(f"QR Error: {e}")
        patient_name = "Patient"
        doctor = "Doctor"
        medicines = []
    
    # Build medicines HTML with full details
    medicines_html = ""
    if medicines and len(medicines) > 0:
        for med in medicines:
            if isinstance(med, dict):
                name = med.get('name', 'Medicine')
                dosage = med.get('dosage', '')
                frequency = med.get('frequency', '')
                instruction = med.get('instruction', '')
                
                medicines_html += f'''
                <div class="m">
                    <strong>💊 {name} {dosage}</strong>
                    {f'<div class="d">⏰ {frequency}</div>' if frequency else ''}
                    {f'<div class="d">📌 {instruction}</div>' if instruction else ''}
                </div>
                '''
            else:
                medicines_html += f'<div class="m">💊 {str(med)}</div>'
    else:
        medicines_html = '<div class="m">📋 No medicines listed</div>'
    
    execution_time = round((time.time() - start_time) * 1000, 2)
    
    return HTMLResponse(f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
        <title>MediMate | {patient_name}</title>
        <style>
            *{{margin:0;padding:0;box-sizing:border-box;}}
            body{{font-family:Arial,sans-serif;background:#004795;min-height:100vh;padding:15px;}}
            .c{{max-width:450px;margin:0 auto;background:white;border-radius:20px;padding:20px;box-shadow:0 5px 20px rgba(0,0,0,0.2);}}
            h1{{color:#004795;font-size:22px;text-align:center;margin-bottom:20px;border-bottom:2px solid #004795;padding-bottom:10px;}}
            .info{{background:#f0f4ff;padding:12px;border-radius:12px;margin-bottom:15px;}}
            .info p{{margin:5px 0;font-size:14px;}}
            .m{{background:#f8fafc;padding:12px;margin:10px 0;border-left:3px solid #004795;border-radius:8px;}}
            .d{{color:#666;font-size:12px;margin-top:5px;margin-left:5px;}}
            .verified{{text-align:center;margin-top:15px;font-size:11px;color:#10b981;}}
            .footer{{text-align:center;margin-top:15px;font-size:10px;color:#999;}}
        </style>
    </head>
    <body>
        <div class="c">
            <h1>📋 MediMate</h1>
            <div class="info">
                <p><strong>👤 Patient:</strong> {patient_name}</p>
                <p><strong>👨‍⚕️ Doctor:</strong> {doctor}</p>
            </div>
            <div style="margin:15px 0 10px 0;"><strong>💊 Prescribed Medicines:</strong></div>
            {medicines_html}
            <div class="verified">✓ Verified by MediMate</div>
            <div class="footer">Scan verified | {execution_time}ms</div>
        </div>
    </body>
    </html>
    """)

@app.get("/")
async def root():
    return {"message": "MediMate API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}