from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database import get_db

router = APIRouter()

class UserSignup(BaseModel):
    name: str
    email: str
    password: str
    phone: str

@router.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):

    # Check if email already exists
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": user.email}
    ).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Insert new user
    db.execute(
        text("INSERT INTO users (name, email, password, phone) VALUES (:name, :email, :password, :phone)"),
        {"name": user.name, "email": user.email, "password": user.password, "phone": user.phone}
    )
    db.commit()

    return {"message": "Account created successfully"}


    @router.post("/login")
    def login(user: UserLogin, db: Session = Depends(get_db)):
        row = db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": user.email}
    ).fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="Email not found")

    if user.password != row.password:
        raise HTTPException(status_code=401, detail="Wrong password")

    # JS reads result.user_id and result.name
    return {"user_id": row.id, "name": row.name}






## Step 3 — Test in `/docs` FIRST, before touching HTML

