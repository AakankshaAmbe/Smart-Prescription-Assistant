from fastapi import APIRouter
from pydantic import BaseModel
from search_engine import search_medicine

router = APIRouter()

class SearchRequest(BaseModel):
    name: str

@router.post("/search-medicine")
def search(req: SearchRequest):
    return search_medicine(req.name)