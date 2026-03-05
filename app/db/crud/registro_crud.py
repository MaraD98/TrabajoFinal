from typing import Optional

from sqlalchemy.orm import Session
from app.models.registro_models import Evento, EventoMultimedia, TipoEvento, NivelDificultad
from app.models.auth_models import Usuario
from app.schemas.registro_schema import EventoCreate
from datetime import date
from sqlalchemy import or_, desc, asc
from sqlalchemy.orm import joinedload

# ============================================================================
# CONSTANTES DE ESTADO
# ============================================================================
ID_ESTADO_BORRADOR = 1
ID_ESTADO_PUBLICADO = 3
ID_ESTADO_FINALIZADO = 4
ID_ESTADO_CANCELADO = 5
ID_ESTADO_DEPURADO = 6
ID_ROL_ADMINISTRADOR = 1
ID_ROL_SUPERVISOR = 2

# ============================================================================
# FUNCIÓN AUXILIAR: Actualizar eventos pasados automáticamente (¡OPTIMIZADA!)
# ============================================================================
def actualizar_eventos_finalizados(db: Session):
    """
    Cambia el estado de eventos publicados cuya fecha ya pasó a FINALIZADO (4).
    🚀 Optimizada: Usa "Bulk Update" directo en la base de datos sin usar bucles for.
    """
    hoy = date.today()
    
    # Hacemos la actualización masiva de un solo golpe
    filas_actualizadas = db.query(Evento).filter(
        Evento.id_estado == ID_ESTADO_PUBLICADO,
        Evento.fecha_evento < hoy
    ).update({"id_estado": ID_ESTADO_FINALIZADO}, synchronize_session=False)
    
    if filas_actualizadas > 0:
        db.commit()
        print(f"✅ [AUTO-UPDATE] {filas_actualizadas} eventos pasados a FINALIZADO")

# ============================================================================
# CREATE (Crear)
# ============================================================================
def create_evento(db: Session, evento: EventoCreate, user_id: int, id_estado_final: int):
    """Crea un nuevo evento en la base de datos"""
    db_evento = Evento(
        nombre_evento = evento.nombre_evento,
        ubicacion = evento.ubicacion,
        fecha_evento = evento.fecha_evento,
        descripcion = evento.descripcion,
        costo_participacion = evento.costo_participacion,
        id_tipo = evento.id_tipo,
        id_dificultad = evento.id_dificultad,
        id_estado = id_estado_final, 
        id_usuario = user_id,
        lat = evento.lat, 
        lng = evento.lng,
        distancia_km=evento.distancia_km,
        ruta_coordenadas=evento.ruta_coordenadas,
        cupo_maximo = evento.cupo_maximo or 0
    )
    db.add(db_evento)
    db.commit()
    db.refresh(db_evento)
    return db_evento

# ============================================================================
# READ (Leer)
# ============================================================================
def get_eventos(db: Session, skip: int = 0, limit: int = 100):
    """
    Devuelve solo eventos PUBLICADOS y FUTUROS (fecha_evento >= hoy).
    """
    actualizar_eventos_finalizados(db)
    hoy = date.today()
    
    resultados = (
        db.query(Evento, Usuario.email, TipoEvento, NivelDificultad)
        .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
        .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
        .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
        .options(joinedload(Evento.multimedia))
        .filter(Evento.id_estado == ID_ESTADO_PUBLICADO)
        .filter(Evento.fecha_evento >= hoy)
        .order_by(asc(Evento.fecha_evento))
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    eventos = []
    for evento, email, tipo, dificultad in resultados:
        evento.email_usuario = email
        evento.tipo_evento = tipo
        evento.nivel_dificultad = dificultad
        eventos.append(evento)
    
    return eventos

def get_eventos_por_usuario(db: Session, id_usuario: int, skip: int = 0, limit: int = 100):
    """
    Devuelve TODOS los eventos de un usuario.
    🚀 Optimizada con todos los JOINs necesarios.
    """
    resultados = (
        db.query(Evento, TipoEvento, NivelDificultad)
        .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
        .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
        .options(joinedload(Evento.multimedia))
        .filter(Evento.id_usuario == id_usuario)
        .order_by(desc(Evento.fecha_evento))
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    eventos_finales = []
    for evento, tipo, dificultad in resultados:
        evento.tipo_evento = tipo
        evento.nivel_dificultad = dificultad
        eventos_finales.append(evento)
        
    return eventos_finales

def get_evento_by_id(db: Session, evento_id: int):
    return db.query(Evento).filter(Evento.id_evento == evento_id).first()

def get_evento_por_nombre_y_fecha(db: Session, nombre: str, fecha: date):
    return db.query(Evento).filter(
        Evento.nombre_evento == nombre,
        Evento.fecha_evento == fecha
    ).first()

# ============================================================================
# UPDATE (Actualizar)
# ============================================================================
def update_evento(db: Session, evento_id: int, evento_data: EventoCreate):
    db_evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
    if db_evento:
        db_evento.nombre_evento = evento_data.nombre_evento
        db_evento.ubicacion = evento_data.ubicacion
        db_evento.fecha_evento = evento_data.fecha_evento
        db_evento.descripcion = evento_data.descripcion
        db_evento.costo_participacion = evento_data.costo_participacion
        db_evento.id_tipo = evento_data.id_tipo
        db_evento.id_dificultad = evento_data.id_dificultad
        db_evento.cupo_maximo = evento_data.cupo_maximo
        db_evento.lat = evento_data.lat
        db_evento.lng = evento_data.lng
        db_evento.distancia_km = evento_data.distancia_km
        db_evento.ruta_coordenadas = evento_data.ruta_coordenadas
        
        db.commit()
        db.refresh(db_evento)
    return db_evento

# ============================================================================
# MULTIMEDIA
# ============================================================================
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

# ============================================================================
# FILTRADO AVANZADO (HU 7.1 a 7.10) (¡OPTIMIZADO!)
# ============================================================================
def filtrar_eventos_avanzado(
    db: Session,
    busqueda: Optional[str] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    fecha_exacta: Optional[date] = None,
    ubicacion: Optional[str] = None,
    id_tipo: Optional[int] = None,
    id_dificultad: Optional[int] = None,
    skip: int = 0,
    limit: int = 50
):
    """
    🚀 Optimizada: Se delegó toda la búsqueda a la base de datos (ilike)
    en lugar de descargar todos los registros a la memoria de Python.
    """
    actualizar_eventos_finalizados(db)
    hoy = date.today()
    
    query = db.query(Evento).filter(
        Evento.id_estado == ID_ESTADO_PUBLICADO,
        Evento.fecha_evento >= hoy
    )
    
    filtros_aplicados = {}
    
    if fecha_exacta:
        query = query.filter(Evento.fecha_evento == fecha_exacta)
        filtros_aplicados['fecha_exacta'] = str(fecha_exacta)
    else:
        if fecha_desde:
            query = query.filter(Evento.fecha_evento >= fecha_desde)
            filtros_aplicados['fecha_desde'] = str(fecha_desde)
        if fecha_hasta:
            query = query.filter(Evento.fecha_evento <= fecha_hasta)
            filtros_aplicados['fecha_hasta'] = str(fecha_hasta)
    
    # Búsqueda en SQL directa usando ilike (insensible a mayúsculas/minúsculas)
    if ubicacion:
        query = query.filter(Evento.ubicacion.ilike(f"%{ubicacion}%"))
        filtros_aplicados['ubicacion'] = ubicacion
    
    if id_tipo:
        query = query.filter(Evento.id_tipo == id_tipo)
        tipo = db.query(TipoEvento).filter(TipoEvento.id_tipo == id_tipo).first()
        filtros_aplicados['tipo'] = tipo.nombre if tipo else f"ID {id_tipo}"
    
    if id_dificultad:
        query = query.filter(Evento.id_dificultad == id_dificultad)
        dificultad = db.query(NivelDificultad).filter(NivelDificultad.id_dificultad == id_dificultad).first()
        filtros_aplicados['dificultad'] = dificultad.nombre if dificultad else f"ID {id_dificultad}"
    
    if busqueda:
        query = query.filter(Evento.nombre_evento.ilike(f"%{busqueda}%"))
        filtros_aplicados['busqueda'] = busqueda
    
    total = query.count()
    query = query.order_by(asc(Evento.fecha_evento))
    eventos = query.offset(skip).limit(limit).all()
    
    if total == 0:
        mensaje = "No se encontraron eventos con los filtros seleccionados." if filtros_aplicados else "No hay eventos publicados en este momento."
    elif total == 1:
        mensaje = "Se encontró 1 evento."
    else:
        mensaje = f"Se encontraron {total} eventos."
    
    return {
        "total": total,
        "eventos": eventos,
        "filtros_aplicados": filtros_aplicados,
        "mensaje": mensaje,
        "skip": skip,
        "limit": limit
    }

def obtener_catalogos_filtros(db: Session):
    tipos = db.query(TipoEvento).all()
    dificultades = db.query(NivelDificultad).all()
    
    return {
        "tipos_evento": [{"id": t.id_tipo, "nombre": t.nombre} for t in tipos],
        "niveles_dificultad": [{"id": d.id_dificultad, "nombre": d.nombre} for d in dificultades]
    }