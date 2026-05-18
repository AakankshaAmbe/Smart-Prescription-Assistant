import qrcode
import os

def generate_qr(patient_id, prescription_id):
    """Generate QR code for prescription - FAST mode"""
    
    try:
        YOUR_COMPUTER_IP = "10.188.120.79"
        
        # Shorter URL for faster loading
        server_url = f"http://{YOUR_COMPUTER_IP}:8000"
        url = f"{server_url}/p/{prescription_id}"
        
        print(f"📱 QR URL: {url}")
        
        # Smaller QR code for faster scan
        qr = qrcode.QRCode(
            version=1,  # Smallest version
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=8,  # Smaller box size
            border=2,    # Smaller border
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color='black', back_color='white')
        
        output_dir = os.path.join(os.path.dirname(__file__), 'output')
        os.makedirs(output_dir, exist_ok=True)
        
        output_path = os.path.join(output_dir, 'qr_code.png')
        img.save(output_path)
        
        return output_path
        
    except Exception as e:
        print(f"QR error: {e}")
        output_dir = os.path.join(os.path.dirname(__file__), 'output')
        os.makedirs(output_dir, exist_ok=True)
        return os.path.join(output_dir, 'qr_code.png')