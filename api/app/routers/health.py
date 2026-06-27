from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SatListRecord

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
def health_check(db: Session = Depends(get_db)):
    try:
        count = db.query(SatListRecord).count()
        return {"status": "ok", "sat_records": count}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
