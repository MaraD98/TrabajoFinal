from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.inscripcion_models import ReservaEvento
from app.models.auth_models import Usuario 
from app.models.notificacion_models import Notificacion # Importamos el modelo para el Sprint 4

# =============================================================================
#  MÉTODOS SPRINT 3 (CUPOS Y RESERVAS) - HU 8.1 a 8.9
# =============================================================================

def count_reservas_activas(db: Session, id_evento: int) -> int:
    """
    Cuenta cuántas reservas hay en estado Pendiente (1) o Confirmada (2).
    Ignora Canceladas (3) o Expiradas (4).
    """
    return db.query(func.count(ReservaEvento.id_reserva))\
        .filter(
            ReservaEvento.id_evento == id_evento,
            ReservaEvento.id_estado_reserva.in_([1, 2]) 
        ).scalar()

def get_reserva_activa_usuario(db: Session, id_evento: int, id_usuario: int):
    """
    Verifica si el usuario ya tiene una reserva activa para evitar duplicados.
    """
    return db.query(ReservaEvento).filter(
        ReservaEvento.id_evento == id_evento,
        ReservaEvento.id_usuario == id_usuario,
        ReservaEvento.id_estado_reserva.in_([1, 2])
    ).first()

# --- Crear Reserva ---
def create_reserva(db: Session, id_evento: int, id_usuario: int, id_estado: int):
    """
    Crea la reserva. 
    id_estado vendrá del Service (1 si es pago, 2 si es gratis).
    """
    nueva_reserva = ReservaEvento(
        id_evento=id_evento,
        id_usuario=id_usuario,
        id_estado_reserva=id_estado # Dinámico
    )
    db.add(nueva_reserva)

    # --- SPRINT 4: Generar Notificación ---
    # id_estado 1 = Pago (Pendiente), id_estado 2 = Gratis (Confirmado)
    texto_notif = "¡Reserva exitosa! Tienes 72 hs para confirmar tu pago." if id_estado == 1 else "¡Inscripción exitosa! Ya tienes tu lugar asegurado."
    
    nueva_notif = Notificacion(
        id_usuario=id_usuario,
        mensaje=texto_notif
    )
    db.add(nueva_notif)
    # --------------------------------------

    db.commit()
    
    # IMPORTANTE: El refresh trae de vuelta la fecha_expiracion calculada por la BD (Computed)
    db.refresh(nueva_reserva) 
    return nueva_reserva

def get_usuario_by_id(db: Session, id_usuario: int):
    """
    Necesario para obtener el email y enviar la notificación.
    """
    return db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()

# --- AGREGADOS PARA EL ADMIN / CONFIRMACIÓN DE PAGO ---

def get_reserva_por_id(db: Session, id_reserva: int):
    """
    Busca una reserva puntual para que el Admin pueda confirmarla.
    """
    return db.query(ReservaEvento).filter(ReservaEvento.id_reserva == id_reserva).first()

def confirmar_reserva_pago(db: Session, reserva: ReservaEvento):
    """
    Cambia el estado de una reserva a 2 (Inscripto/Pagado).
    """
    reserva.id_estado_reserva = 2

    # --- SPRINT 4: Notificar confirmación de pago ---
    notif_pago = Notificacion(
        id_usuario=reserva.id_usuario,
        mensaje="Tu pago ha sido verificado. ¡Ya estás oficialmente inscripto!"
    )
    db.add(notif_pago)
    # -----------------------------------------------

    db.commit()
    db.refresh(reserva)
    return reserva