from sqlalchemy.orm import Session
from app.models.registro_models import Evento, EventoMultimedia, EliminacionEvento, TipoEvento, NivelDificultad 
from app.schemas.registro_schema import EventoCreate
from datetime import date, datetime
from sqlalchemy import or_, and_, func
from typing import Optional
from fastapi import HTTPException

# CONSTANTES DE ESTADO
ID_ESTADO_BORRADOR = 1
ID_ESTADO_PUBLICADO = 3
ID_ESTADO_FINALIZADO = 4
ID_ESTADO_CANCELADO = 5
ID_ESTADO_PENDIENTE_ELIMINACION = 6
ID_ESTADO_DEPURADO = 7

# CONSTANTES DE ROLES
ID_ROL_ADMINISTRADOR = 1
ID_ROL_SUPERVISOR = 2

# ============================================================================
# 🔧 FUNCIÓN AUXILIAR: Normalizar texto para búsqueda sin acentos
# ============================================================================
def normalizar_texto(texto: str) -> str:
    """
    Remueve acentos y convierte a minúsculas para búsqueda flexible.
    'Córdoba' → 'cordoba'
    'São Paulo' → 'sao paulo'
    """
    import unicodedata
    texto_nfd = unicodedata.normalize('NFD', texto)
    sin_acentos = ''.join(char for char in texto_nfd if unicodedata.category(char) != 'Mn')
    return sin_acentos.lower()

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
        lng = evento.lng   
    )
    db.add(db_evento)
    db.commit()
    db.refresh(db_evento)
    return db_evento

# ============================================================================
# ✅ CORRECCIÓN: Actualizar eventos pasados automáticamente
# ============================================================================
def actualizar_eventos_finalizados(db: Session):
    """
    Cambia el estado de eventos publicados cuya fecha ya pasó a FINALIZADO (4).
    Se ejecuta antes de cada consulta para mantener la base de datos actualizada.
    """
    hoy = date.today()
    
    # Buscar eventos publicados con fecha pasada
    eventos_pasados = db.query(Evento).filter(
        Evento.id_estado == ID_ESTADO_PUBLICADO,
        Evento.fecha_evento < hoy
    ).all()
    
    if eventos_pasados:
        print(f"🔄 [AUTO-UPDATE] Finalizando {len(eventos_pasados)} eventos pasados...")
        for evento in eventos_pasados:
            evento.id_estado = ID_ESTADO_FINALIZADO
            print(f"   ✅ Evento '{evento.nombre_evento}' ({evento.fecha_evento}) → FINALIZADO")
        
        db.commit()
        print(f"✅ [AUTO-UPDATE] {len(eventos_pasados)} eventos actualizados")
    
# -----------------------------------------------------------------------------
# 2. READ (Leer todos) - ✅ CORREGIDO: Filtra eventos pasados
# -----------------------------------------------------------------------------
def get_eventos(db: Session, skip: int = 0, limit: int = 100):
    """
    Devuelve solo eventos PUBLICADOS y FUTUROS (fecha_evento >= hoy).
    ✅ Actualiza automáticamente eventos pasados a FINALIZADO antes de consultar.
    """
    # 1. Actualizar eventos pasados a FINALIZADO
    actualizar_eventos_finalizados(db)
    
    # 2. Obtener fecha actual
    hoy = date.today()
    
    # 3. Consultar solo eventos publicados y futuros
    return (
        db.query(Evento)
        .filter(Evento.id_estado == ID_ESTADO_PUBLICADO)  # Solo publicados
        .filter(Evento.fecha_evento >= hoy)               # ✅ Solo futuros
        .order_by(Evento.fecha_evento.asc())              # Ordenar por fecha
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_eventos_por_usuario(db: Session, id_usuario: int, skip: int = 0, limit: int = 100):
    """
    Devuelve TODOS los eventos de un usuario (incluyendo pasados y borradores).
    No filtra por fecha porque el usuario puede querer ver su historial.
    """
    return (
        db.query(Evento)
        .filter(Evento.id_usuario == id_usuario)
        .order_by(Evento.fecha_evento.desc())  # Más recientes primero
        .offset(skip)
        .limit(limit)
        .all()
    )

# -----------------------------------------------------------------------------
# 3. READ ONE
# -----------------------------------------------------------------------------
def get_evento_by_id(db: Session, evento_id: int):
    return db.query(Evento).filter(Evento.id_evento == evento_id).first()

# -----------------------------------------------------------------------------
# 4. UPDATE
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
        db.commit()
        db.refresh(db_evento)
    return db_evento

def get_evento_por_nombre_y_fecha(db: Session, nombre: str, fecha: date):
    return db.query(Evento).filter(
        Evento.nombre_evento == nombre,
        Evento.fecha_evento == fecha
    ).first()
    
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

# -----------------------------------------------------------------------------
# GESTIÓN DE BAJAS Y ESTADOS
# -----------------------------------------------------------------------------
def cancelar_evento(db: Session, id_evento: int, motivo: str):
    from app.models.registro_models import Evento, EliminacionEvento
    try:
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        if evento.id_estado == ID_ESTADO_CANCELADO:
            raise HTTPException(status_code=400, detail="El evento ya está cancelado")
        
        eliminacion_existente = db.query(EliminacionEvento).filter(
            EliminacionEvento.id_evento == id_evento
        ).first()
        
        if eliminacion_existente:
            eliminacion_existente.motivo_eliminacion = motivo
            eliminacion_existente.fecha_eliminacion = datetime.now()
        else:
            nueva_eliminacion = EliminacionEvento(
                id_evento=id_evento,
                motivo_eliminacion=motivo,
                fecha_eliminacion=datetime.now(),
                id_usuario=evento.id_usuario,
                notificacion_enviada=False
            )
            db.add(nueva_eliminacion)
        
        estado_anterior = evento.id_estado
        evento.id_estado = ID_ESTADO_CANCELADO
        db.commit()
        db.refresh(evento)
        
        return {
            "mensaje": "Evento cancelado exitosamente (Soft Delete)",
            "id_evento": evento.id_evento,
            "nombre_evento": evento.nombre_evento,
            "estado_anterior": estado_anterior,
            "estado_actual": "Cancelado",
            "id_estado": ID_ESTADO_CANCELADO
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al cancelar evento: {str(e)}")

def solicitar_baja_evento(db: Session, evento_id: int, motivo: str):
    evento = get_evento_by_id(db, evento_id)
    if evento:
        evento.id_estado = ID_ESTADO_PENDIENTE_ELIMINACION
        if hasattr(evento, 'motivo_baja'): evento.motivo_baja = motivo
        db.commit()
        db.refresh(evento)
    return evento

def depurar_evento(db: Session, id_evento: int, motivo: str):
    from app.models.registro_models import Evento, EliminacionEvento
    try:
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        nueva_eliminacion = EliminacionEvento(
            id_evento=id_evento,
            motivo_eliminacion=f"[DEPURACIÓN ADMIN] {motivo}",
            fecha_eliminacion=datetime.now(),
            id_usuario=evento.id_usuario,
            notificacion_enviada=False
        )
        db.add(nueva_eliminacion)
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

# ============================================================================
# ✅ FILTRADO CORREGIDO: Búsqueda separada según HU 7.3 y 7.6 + Filtro de fecha
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
    Filtra eventos publicados según múltiples criterios combinables.
    ✅ Solo muestra eventos FUTUROS (fecha_evento >= hoy)
    ✅ Actualiza automáticamente eventos pasados a FINALIZADO
    """
    
    # 1. Actualizar eventos pasados
    actualizar_eventos_finalizados(db)
    
    # 2. Obtener fecha actual
    hoy = date.today()
    
    # 3. BASE QUERY: Solo eventos PUBLICADOS y FUTUROS
    query = db.query(Evento).filter(
        Evento.id_estado == ID_ESTADO_PUBLICADO,
        Evento.fecha_evento >= hoy  # ✅ Solo eventos futuros
    )
    
    filtros_aplicados = {}
    
    # 4. FILTRO POR FECHA (adicional)
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
    
    # 5. FILTRO POR UBICACIÓN
    if ubicacion:
        ubicacion_normalizada = normalizar_texto(ubicacion)
        eventos_temp = query.all()
        eventos_filtrados = [
            e for e in eventos_temp 
            if ubicacion_normalizada in normalizar_texto(e.ubicacion)
        ]
        
        if eventos_filtrados:
            ids_filtrados = [e.id_evento for e in eventos_filtrados]
            query = query.filter(Evento.id_evento.in_(ids_filtrados))
        else:
            query = query.filter(Evento.id_evento == -1)
        
        filtros_aplicados['ubicacion'] = ubicacion
    
    # 6. FILTRO POR TIPO
    if id_tipo:
        query = query.filter(Evento.id_tipo == id_tipo)
        tipo = db.query(TipoEvento).filter(TipoEvento.id_tipo == id_tipo).first()
        filtros_aplicados['tipo'] = tipo.nombre if tipo else f"ID {id_tipo}"
    
    # 7. FILTRO POR DIFICULTAD
    if id_dificultad:
        query = query.filter(Evento.id_dificultad == id_dificultad)
        dificultad = db.query(NivelDificultad).filter(
            NivelDificultad.id_dificultad == id_dificultad
        ).first()
        filtros_aplicados['dificultad'] = dificultad.nombre if dificultad else f"ID {id_dificultad}"
    
    # 8. BÚSQUEDA POR NOMBRE
    if busqueda:
        busqueda_normalizada = normalizar_texto(busqueda)
        eventos_temp = query.all()
        eventos_filtrados = [
            e for e in eventos_temp 
            if busqueda_normalizada in normalizar_texto(e.nombre_evento)
        ]
        
        if eventos_filtrados:
            ids_filtrados = [e.id_evento for e in eventos_filtrados]
            query = query.filter(Evento.id_evento.in_(ids_filtrados))
        else:
            query = query.filter(Evento.id_evento == -1)
        
        filtros_aplicados['busqueda'] = busqueda
    
    # 9. CONTAR TOTAL
    total = query.count()
    
    # 10. ORDENAR
    query = query.order_by(Evento.fecha_evento.asc())
    
    # 11. PAGINAR
    eventos = query.offset(skip).limit(limit).all()
    
    # 12. MENSAJE
    if total == 0:
        if filtros_aplicados:
            mensaje = "No se encontraron eventos con los filtros seleccionados."
        else:
            mensaje = "No hay eventos publicados en este momento."
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
    """Devuelve los catálogos para poblar los filtros."""
    tipos = db.query(TipoEvento).all()
    dificultades = db.query(NivelDificultad).all()
    
    return {
        "tipos_evento": [{"id": t.id_tipo, "nombre": t.nombre} for t in tipos],
        "niveles_dificultad": [{"id": d.id_dificultad, "nombre": d.nombre} for d in dificultades]
    }