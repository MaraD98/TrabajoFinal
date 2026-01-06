from sqlalchemy.orm import Session
from app.models.registro_models import Evento, EventoMultimedia, EliminacionEvento
from app.schemas.registro_schema import EventoCreate
from datetime import date
from sqlalchemy import or_

# CONSTANTES DE ESTADO (Las ponemos acá arriba para orden)
# -----------------------------------------------------------------------------
ID_ESTADO_BORRADOR = 1
ID_ESTADO_PUBLICADO = 3
ID_ESTADO_CANCELADO = 5  
ID_ESTADO_PENDIENTE_ELIMINACION = 6
# CONSTANTES DE ROLES (Confirmados con tu DB)
ID_ROL_ADMINISTRADOR = 1
ID_ROL_SUPERVISOR = 2
# (Asegurate mirando tu tabla EstadoEvento en la DB que el ID sea 5.
# -----------------------------------------------------------------------------
# 1. CREATE (Crear) - 
# -----------------------------------------------------------------------------
# Agregamos 'user_id' como parámetro para saber quién crea el evento
def create_evento(db: Session, evento: EventoCreate, user_id: int, id_estado: int):
    
    # Creamos el objeto del modelo asignando CAMPO POR CAMPO (manualmente)
    # Así queda bien claro qué dato va en qué columna.
    db_evento = Evento(
        nombre_evento       = evento.nombre_evento,
        ubicacion           = evento.ubicacion,
        fecha_evento        = evento.fecha_evento,
        descripcion         = evento.descripcion,
        costo_participacion = evento.costo_participacion,
        id_tipo             = evento.id_tipo,
        id_dificultad       = evento.id_dificultad,
        id_estado  = id_estado,      
        id_usuario = user_id            
    )
    
    db.add(db_evento)
    db.commit()
    db.refresh(db_evento)
    return db_evento

# -----------------------------------------------------------------------------
# 2. READ (Leer todos) - Esto se usa cuando llega un GET (lista)
# -----------------------------------------------------------------------------
def get_eventos(db: Session, skip: int = 0, limit: int = 100):
    #return db.query(Evento).offset(skip).limit(limit).all()
    return (
        db.query(Evento)
        .filter(
            or_(
                Evento.id_estado == 3                  # Publicado
            )
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

# -----------------------------------------------------------------------------
# 3. READ ONE (Leer uno solo) - Esto se usa cuando llega un GET con ID
# -----------------------------------------------------------------------------
def get_evento_by_id(db: Session, evento_id: int):
    return db.query(Evento).filter(Evento.id_evento == evento_id).first()

# -----------------------------------------------------------------------------
# 4. UPDATE (Actualizar) - Esto se usa cuando llega un PUT
# -----------------------------------------------------------------------------
def update_evento(db: Session, evento_id: int, evento_data: EventoCreate):
    # Primero buscamos si el evento existe
    db_evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
    
    if db_evento:
        # Si existe, actualizamos los campos con lo nuevo que llegó
        db_evento.nombre_evento       = evento_data.nombre_evento
        db_evento.ubicacion           = evento_data.ubicacion
        db_evento.fecha_evento        = evento_data.fecha_evento
        db_evento.descripcion         = evento_data.descripcion
        db_evento.costo_participacion = evento_data.costo_participacion
        db_evento.id_tipo             = evento_data.id_tipo
        db_evento.id_dificultad       = evento_data.id_dificultad
        
        # Guardamos los cambios
        db.commit()
        db.refresh(db_evento)
    
    return db_evento

def get_evento_por_nombre_y_fecha(db: Session, nombre: str, fecha: date):
    """
    Busca si existe un evento con el mismo nombre EXACTO en la misma fecha.
    """
    return db.query(Evento).filter(
        Evento.nombre_evento == nombre,
        Evento.fecha_evento == fecha
    ).first()
    
# --- TU CRUD NUEVO ---
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

# --- (NUEVO) HU 4.1: Cancelación con registro en historial ---
def cancelar_evento_con_motivo(db: Session, evento: Evento, motivo: str, id_usuario_cancelador: int):
    # 1. Insertar en tabla Eliminacion_Evento
    nueva_eliminacion = EliminacionEvento(
        id_evento=evento.id_evento,
        motivo_eliminacion=motivo,
        id_usuario=id_usuario_cancelador,
        notificacion_enviada=False 
    )
    db.add(nueva_eliminacion)

    # 2. Actualizar estado del Evento a CANCELADO (Soft Delete)
    evento.id_estado = ID_ESTADO_CANCELADO
    
    db.commit()
    db.refresh(evento)
    return evento
