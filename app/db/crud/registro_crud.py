from sqlalchemy.orm import Session
from app.models.registro_models import Evento, EventoMultimedia, TipoEvento, NivelDificultad
from app.schemas.registro_schema import EventoCreate
from datetime import date
from sqlalchemy import or_, func
from typing import Optional

# ============================================================================
# CONSTANTES DE ESTADO
# ============================================================================
ID_ESTADO_BORRADOR = 1
ID_ESTADO_PUBLICADO = 3
ID_ESTADO_FINALIZADO = 4
ID_ESTADO_CANCELADO = 5
ID_ESTADO_DEPURADO = 6  # ✅ ANTES ERA 7, AHORA ES 6
ID_ROL_ADMINISTRADOR = 1
ID_ROL_SUPERVISOR = 2

# ============================================================================
# FUNCIÓN AUXILIAR: Normalizar texto para búsqueda sin acentos
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

# ============================================================================
# FUNCIÓN AUXILIAR: Actualizar eventos pasados automáticamente
# ============================================================================
def actualizar_eventos_finalizados(db: Session):
    """
    Cambia el estado de eventos publicados cuya fecha ya pasó a FINALIZADO (4).
    Se ejecuta antes de cada consulta para mantener la base de datos actualizada.
    """
    hoy = date.today()
    
    eventos_pasados = db.query(Evento).filter(
        Evento.id_estado == ID_ESTADO_PUBLICADO,
        Evento.fecha_evento < hoy
    ).all()
    
    if eventos_pasados:
        print(f"🔄 [AUTO-UPDATE] Finalizando {len(eventos_pasados)} eventos pasados...")
        for evento in eventos_pasados:
            evento.id_estado = ID_ESTADO_FINALIZADO
            print(f"  ✅ Evento '{evento.nombre_evento}' ({evento.fecha_evento}) → FINALIZADO")
        
        db.commit()
        print(f"✅ [AUTO-UPDATE] {len(eventos_pasados)} eventos actualizados")

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
    ✅ Actualiza automáticamente eventos pasados a FINALIZADO antes de consultar.
    """
    # 1. Actualizar eventos pasados a FINALIZADO
    actualizar_eventos_finalizados(db)
    
    # 2. Obtener fecha actual
    hoy = date.today()
    
    # 3. Consultar solo eventos publicados y futuros
    return (
        db.query(Evento)
        .filter(Evento.id_estado == ID_ESTADO_PUBLICADO)
        .filter(Evento.fecha_evento >= hoy)
        .order_by(Evento.fecha_evento.asc())
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
        .order_by(Evento.fecha_evento.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_evento_by_id(db: Session, evento_id: int):
    """Obtiene un evento por su ID"""
    return db.query(Evento).filter(Evento.id_evento == evento_id).first()

def get_evento_por_nombre_y_fecha(db: Session, nombre: str, fecha: date):
    """Valida duplicados: mismo nombre y fecha"""
    return db.query(Evento).filter(
        Evento.nombre_evento == nombre,
        Evento.fecha_evento == fecha
    ).first()

# ============================================================================
# UPDATE (Actualizar)
# ============================================================================
def update_evento(db: Session, evento_id: int, evento_data: EventoCreate):
    """Actualiza un evento existente"""
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
    """Crea un registro de multimedia para un evento"""
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
# FILTRADO AVANZADO (HU 7.1 a 7.10)
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
        Evento.fecha_evento >= hoy
    )
    
    filtros_aplicados = {}
    
    # 4. FILTRO POR FECHA
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