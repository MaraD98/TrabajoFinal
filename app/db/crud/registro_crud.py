from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import date, datetime

# Asegurate de importar Reserva_Evento y Usuario de donde los tengas definidos
from app.models.registro_models import Evento, EventoMultimedia, Reserva_Evento, EliminacionEvento
from app.models.auth_models import Usuario 
from app.schemas.registro_schema import EventoCreate
from fastapi import HTTPException

# CONSTANTES DE ESTADO (Las ponemos acá arriba para orden)
# -----------------------------------------------------------------------------
ID_ESTADO_BORRADOR = 1
ID_ESTADO_PUBLICADO = 3
ID_ESTADO_FINALIZADO = 4
ID_ESTADO_CANCELADO = 5              # Baja lógica (visible en historial)
ID_ESTADO_PENDIENTE_ELIMINACION = 6  # Solicitud de externo
ID_ESTADO_DEPURADO = 7               # Mantenimiento (invisible)
# CONSTANTES DE ROLES (Confirmados con tu DB)
ID_ROL_ADMINISTRADOR = 1
ID_ROL_SUPERVISOR = 2
# (Asegurate mirando tu tabla EstadoEvento en la DB que el ID sea 5.
# -----------------------------------------------------------------------------
# 1. CREATE (Crear)
# -----------------------------------------------------------------------------
def create_evento(db: Session, evento: EventoCreate, user_id: int, id_estado_final: int):    
    db_evento = Evento(
        nombre_evento       = evento.nombre_evento,
        ubicacion           = evento.ubicacion,
        fecha_evento        = evento.fecha_evento,
        descripcion         = evento.descripcion,
        costo_participacion = evento.costo_participacion,
        id_tipo             = evento.id_tipo,
        id_dificultad       = evento.id_dificultad,
        id_estado  = id_estado_final, 
        id_usuario = user_id,
        lat = evento.lat,  
        lng = evento.lng,
        cupo_maximo = evento.cupo_maximo # Aseguramos guardar el cupo
    )
    
    db.add(db_evento)
    db.commit()
    db.refresh(db_evento)
    return db_evento
    

# -----------------------------------------------------------------------------
# 2. READ (Leer todos)
# -----------------------------------------------------------------------------
def get_eventos(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Evento)
        .filter(Evento.id_estado != ID_ESTADO_DEPURADO) # Oculta la basura
        .filter(
            or_(
                Evento.id_estado == 3                  # Publicado
            )
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_eventos_por_usuario(db: Session, id_usuario: int, skip: int = 0, limit: int = 100):
    return (
        db.query(Evento)
        .filter(Evento.id_usuario == id_usuario)
        .offset(skip)
        .limit(limit)
        .all()
    )


# -----------------------------------------------------------------------------
# 3. READ ONE (Leer uno solo)
# -----------------------------------------------------------------------------
def get_evento_by_id(db: Session, evento_id: int):
    return db.query(Evento).filter(Evento.id_evento == evento_id).first()

# -----------------------------------------------------------------------------
# 4. UPDATE (Actualizar)
# -----------------------------------------------------------------------------
def update_evento(db: Session, evento_id: int, evento_data: EventoCreate):
    db_evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
    
    if db_evento:
        db_evento.nombre_evento       = evento_data.nombre_evento
        db_evento.ubicacion           = evento_data.ubicacion
        db_evento.fecha_evento        = evento_data.fecha_evento
        db_evento.descripcion         = evento_data.descripcion
        db_evento.costo_participacion = evento_data.costo_participacion
        db_evento.id_tipo             = evento_data.id_tipo
        db_evento.id_dificultad       = evento_data.id_dificultad
        db_evento.lat = evento_data.lat
        db_evento.lng = evento_data.lng
        db_evento.cupo_maximo = evento_data.cupo_maximo

        db.commit()
        db.refresh(db_evento)
    
    return db_evento

# -----------------------------------------------------------------------------
# 5. DELETE (Borrar)
# -----------------------------------------------------------------------------
def delete_evento(db: Session, evento_id: int):
    db_evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
    if db_evento:
        db.delete(db_evento)
        db.commit()
    return db_evento


def get_evento_por_nombre_y_fecha(db: Session, nombre: str, fecha: date):
    return db.query(Evento).filter(
        Evento.nombre_evento == nombre,
        Evento.fecha_evento == fecha
    ).first()
    
# -----------------------------------------------------------------------------
# MULTIMEDIA
# -----------------------------------------------------------------------------
def create_multimedia(db: Session, id_evento: int, url: str, tipo: str):
    nuevo_registro = EventoMultimedia(
        id_evento=id_evento,
        url_archivo=url,
        tipo_archivo=tipo
    )
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    return nuevo_registro

# =============================================================================
#  NUEVOS MÉTODOS SPRINT 3 (CUPOS Y RESERVAS) - HU 8.1 a 8.9
# =============================================================================

def count_reservas_activas(db: Session, id_evento: int) -> int:
    """
    Cuenta cuántas reservas hay en estado Pendiente (1) o Confirmada (2).
    Ignora Canceladas (3) o Expiradas (4).
    """
    return db.query(func.count(Reserva_Evento.id_reserva))\
        .filter(
            Reserva_Evento.id_evento == id_evento,
            Reserva_Evento.id_estado_reserva.in_([1, 2]) 
        ).scalar()

def get_reserva_activa_usuario(db: Session, id_evento: int, id_usuario: int):
    """
    Verifica si el usuario ya tiene una reserva activa para evitar duplicados.
    """
    return db.query(Reserva_Evento).filter(
        Reserva_Evento.id_evento == id_evento,
        Reserva_Evento.id_usuario == id_usuario,
        Reserva_Evento.id_estado_reserva.in_([1, 2])
    ).first()

# --- MODIFICADO: AHORA RECIBE EL ESTADO COMO PARÁMETRO ---
def create_reserva(db: Session, id_evento: int, id_usuario: int, id_estado: int):
    """
    Crea la reserva. 
    id_estado vendrá del Service (1 si es pago, 2 si es gratis).
    """
    nueva_reserva = Reserva_Evento(
        id_evento=id_evento,
        id_usuario=id_usuario,
        id_estado_reserva=id_estado # <--- Dinámico ahora
    )
    db.add(nueva_reserva)
    db.commit()
    
    # IMPORTANTE: El refresh trae de vuelta la fecha_expiracion calculada por la BD
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
    return db.query(Reserva_Evento).filter(Reserva_Evento.id_reserva == id_reserva).first()

def confirmar_reserva_pago(db: Session, reserva: Reserva_Evento):
    """
    Cambia el estado de una reserva a 2 (Inscripto/Pagado).
    """
    reserva.id_estado_reserva = 2
    db.commit()
    db.refresh(reserva)
    return reserva
# -----------------------------------------------------------------------------
# 4. GESTIÓN DE BAJAS Y ESTADOS (Lógica Nueva)
# -----------------------------------------------------------------------------

# HU 4.1 y 4.2 (Parte Admin/Aprobación): Mover a CANCELADO (5)
def cancelar_evento(db: Session, id_evento: int, motivo: str):
    """
    ✅ SOFT DELETE: Cambia el evento a estado 5 (Cancelado).
    
    El evento NO se elimina físicamente, solo cambia su estado.
    Se crea/actualiza el registro en eliminacion_evento para auditoría.
    """
    from app.models.registro_models import Evento, EliminacionEvento
    
    try:
        print(f"🔍 [DEBUG] Iniciando cancelación del evento {id_evento}")
        
        # 1. Buscar el evento
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            print(f"❌ [ERROR] Evento {id_evento} no encontrado")
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        print(f"✅ [DEBUG] Evento encontrado: {evento.nombre_evento}, Estado actual: {evento.id_estado}")
        
        # 2. Validar que se pueda cancelar
        if evento.id_estado == ID_ESTADO_CANCELADO:
            print(f"⚠️ [WARN] El evento ya está cancelado")
            raise HTTPException(status_code=400, detail="El evento ya está cancelado")
        
        # 3. Buscar si ya existe un registro de eliminación
        eliminacion_existente = db.query(EliminacionEvento).filter(
            EliminacionEvento.id_evento == id_evento
        ).first()
        
        if eliminacion_existente:
            print(f"📝 [DEBUG] Actualizando registro de eliminación existente ID: {eliminacion_existente.id_eliminacion}")
            eliminacion_existente.motivo_eliminacion = motivo
            eliminacion_existente.fecha_eliminacion = datetime.now()
        else:
            print(f"📝 [DEBUG] Creando nuevo registro de eliminación")
            nueva_eliminacion = EliminacionEvento(
                id_evento=id_evento,
                motivo_eliminacion=motivo,
                fecha_eliminacion=datetime.now(),
                id_usuario=evento.id_usuario,
                notificacion_enviada=False
            )
            db.add(nueva_eliminacion)
        
        # 4. ✅ SOFT DELETE: Cambiar estado a 5 (Cancelado)
        estado_anterior = evento.id_estado
        evento.id_estado = ID_ESTADO_CANCELADO
        print(f"✅ [DEBUG] Cambiando estado de {estado_anterior} a {ID_ESTADO_CANCELADO}")
        
        # 5. Commit
        db.commit()
        db.refresh(evento)
        
        print(f"🎉 [SUCCESS] Evento cancelado exitosamente")
        
        return {
            "mensaje": "Evento cancelado exitosamente (Soft Delete)",
            "id_evento": evento.id_evento,
            "nombre_evento": evento.nombre_evento,
            "estado_anterior": estado_anterior,
            "estado_actual": "Cancelado",
            "id_estado": ID_ESTADO_CANCELADO
        }
        
    except HTTPException as he:
        # Re-lanzar excepciones HTTP tal cual
        raise he
    except Exception as e:
        print(f"💥 [ERROR CRÍTICO] {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Error al cancelar evento: {str(e)}"
        )


# HU 4.2 (Parte Usuario): Solicitar Baja -> PENDIENTE (6)
def solicitar_baja_evento(db: Session, evento_id: int, motivo: str):
    evento = get_evento_by_id(db, evento_id)
    if evento:
        evento.id_estado = ID_ESTADO_PENDIENTE_ELIMINACION
        if hasattr(evento, 'motivo_baja'): evento.motivo_baja = motivo
        
        db.commit()
        db.refresh(evento)
    return evento

# HU 4.3 (Admin Mantenimiento): Limpiar -> DEPURADO (7)
def depurar_evento(db: Session, id_evento: int, motivo: str):
    """
    ✅ HARD DELETE LÓGICO: Cambia el evento a estado 7 (Depurado).
    """
    from app.models.registro_models import Evento, EliminacionEvento
    
    try:
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # Crear registro de auditoría
        nueva_eliminacion = EliminacionEvento(
            id_evento=id_evento,
            motivo_eliminacion=f"[DEPURACIÓN ADMIN] {motivo}",
            fecha_eliminacion=datetime.now(),
            id_usuario=evento.id_usuario,
            notificacion_enviada=False
        )
        db.add(nueva_eliminacion)
        
        # Cambiar a estado 7 (Depurado)
        evento.id_estado = ID_ESTADO_DEPURADO
        
        db.commit()
        
        return {
            "mensaje": "Evento depurado exitosamente",
            "id_evento": evento.id_evento,
            "estado_nuevo": "Depurado por Admin"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al depurar evento: {str(e)}")
