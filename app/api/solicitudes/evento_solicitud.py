from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.evento_solicitud import EventoSolicitudCreate, EventoSolicitudResponse
from app.db.crud import evento_solicitud as crud
from app.db.base import SessionLocal

router = APIRouter(prefix="/api/eventos-externos", tags=["Eventos Externos"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/solicitudes", response_model=EventoSolicitudResponse, status_code=status.HTTP_201_CREATED)
def crear_solicitud_evento(
    solicitud: EventoSolicitudCreate,
    db: Session = Depends(get_db)
):
    """
    Crear una nueva solicitud de evento externo.
    Estado inicial: Pendiente de revisión
    """
    try:
        nueva_solicitud = crud.crear_solicitud(db, solicitud)
        return nueva_solicitud
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear la solicitud: {str(e)}"
        )

@router.get("/solicitudes/{solicitud_id}", response_model=EventoSolicitudResponse)
def obtener_solicitud(solicitud_id: int, db: Session = Depends(get_db)):
    solicitud = crud.obtener_solicitud(db, solicitud_id)
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )
    return solicitud