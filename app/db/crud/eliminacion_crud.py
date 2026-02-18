"""
CRUD de Eliminación de Eventos - ACTUALIZADO

Archivo: app/db/crud/eliminacion_crud.py
Maneja estados: 5 (Cancelado), 6 (Depurado)
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.eliminacion_models import EliminacionEvento
from app.models.registro_models import Evento
from app.models.auth_models import Usuario
from datetime import datetime
from typing import List

# ============================================================================
# CONSTANTES DE ESTADO
# ============================================================================
ID_ESTADO_PUBLICADO = 3
ID_ESTADO_FINALIZADO = 4
ID_ESTADO_CANCELADO = 5
ID_ESTADO_DEPURADO = 6  # ✅ ANTES ERA 7, AHORA ES 6

# ============================================================================
# CREAR REGISTROS DE ELIMINACIÓN
# ============================================================================
def crear_registro_eliminacion(
    db: Session,
    id_evento: int,
    motivo: str,
    id_usuario: int,
    prefijo: str = ""
) -> EliminacionEvento:
    """Crea un registro de auditoría en eliminacion_evento."""
    motivo_completo = f"{prefijo} {motivo}".strip() if prefijo else motivo
    
    nueva_eliminacion = EliminacionEvento(
        id_evento=id_evento,
        motivo_eliminacion=motivo_completo,
        fecha_eliminacion=datetime.now(),
        id_usuario=id_usuario,
        notificacion_enviada=False,
        estado_solicitud='pendiente'
    )
    db.add(nueva_eliminacion)
    db.flush()
    return nueva_eliminacion

def obtener_registro_eliminacion(db: Session, id_evento: int) -> EliminacionEvento | None:
    """Obtiene el registro de eliminación de un evento."""
    return db.query(EliminacionEvento).filter(
        EliminacionEvento.id_evento == id_evento
    ).first()

# ============================================================================
# CAMBIAR ESTADOS DE EVENTOS
# ============================================================================
def cancelar_evento(db: Session, id_evento: int) -> Evento:
    """Cambia el evento a estado 5 (Cancelado - Soft Delete)."""
    evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
    if evento:
        evento.id_estado = ID_ESTADO_CANCELADO
        db.flush()
    return evento

def depurar_evento(db: Session, id_evento: int) -> Evento:
    """Cambia el evento a estado 6 (Depurado - Hard Delete Lógico)."""
    evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
    if evento:
        evento.id_estado = ID_ESTADO_DEPURADO
        db.flush()
    return evento

def restaurar_evento(db: Session, id_evento: int) -> Evento:
    """Restaura el evento a estado 3 (Publicado)."""
    evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
    if evento:
        evento.id_estado = ID_ESTADO_PUBLICADO
        db.flush()
    return evento

# ============================================================================
# CONSULTAS - SOLICITUDES DE BAJA
# ============================================================================
def obtener_bajas_pendientes(db: Session) -> List[dict]:
    """
    Obtiene todas las solicitudes de baja pendientes.
    Busca eventos PUBLICADOS (estado 3) que tienen registro en eliminacion_evento.
    """
    query = (
        db.query(EliminacionEvento, Evento, Usuario)
        .join(Evento, EliminacionEvento.id_evento == Evento.id_evento)
        .join(Usuario, EliminacionEvento.id_usuario == Usuario.id_usuario)
        .filter(
            EliminacionEvento.estado_solicitud == 'pendiente'
        )
        .order_by(desc(EliminacionEvento.fecha_eliminacion))
        .all()
    )
    
    resultados = []
    for elim, evento, usuario in query:
        resultados.append({
            'id_eliminacion': elim.id_eliminacion,
            'id_evento': evento.id_evento,
            'nombre_evento': evento.nombre_evento,
            'motivo': elim.motivo_eliminacion,
            'fecha_solicitud': elim.fecha_eliminacion,
            'usuario_solicitante': usuario.email
        })
    
    return resultados

# ============================================================================
# CONSULTAS - HISTORIAL DE ELIMINACIONES
# ============================================================================
def obtener_historial_eliminaciones(db: Session) -> List[dict]:
    """
    Obtiene todos los eventos del historial:
    - Estado 4: Finalizados (fecha pasada)
    - Estado 5: Cancelados (Soft Delete)
    - Estado 6: Depurados (Hard Delete Lógico)
    """
    # Primero obtenemos eventos con registro de eliminación (estados 5 y 6)
    query_con_eliminacion = (
        db.query(EliminacionEvento, Evento, Usuario)
        .join(Evento, EliminacionEvento.id_evento == Evento.id_evento)
        .outerjoin(Usuario, EliminacionEvento.id_usuario == Usuario.id_usuario)
        .filter(Evento.id_estado.in_([ID_ESTADO_CANCELADO, ID_ESTADO_DEPURADO]))
        .order_by(desc(EliminacionEvento.fecha_eliminacion))
        .all()
    )
    
    # Luego obtenemos eventos finalizados (estado 4) SIN registro de eliminación
    from datetime import date
    eventos_finalizados = (
        db.query(Evento)
        .outerjoin(EliminacionEvento, Evento.id_evento == EliminacionEvento.id_evento)
        .filter(
            Evento.id_estado == ID_ESTADO_FINALIZADO,
            EliminacionEvento.id_eliminacion == None  # Solo finalizados SIN registro de eliminación
        )
        .order_by(desc(Evento.fecha_evento))
        .all()
    )
    
    resultados = []
    
    # Procesar eventos con registro de eliminación
    for elim, evento, usuario in query_con_eliminacion:
        if evento.id_estado == ID_ESTADO_CANCELADO:
            tipo_elim = "soft_delete"
            estado_texto = "Cancelado (Soft Delete)"
        elif evento.id_estado == ID_ESTADO_DEPURADO:
            tipo_elim = "hard_delete"
            estado_texto = "Depurado (Hard Delete Lógico)"
        else:
            tipo_elim = "otro"
            estado_texto = f"Estado {evento.id_estado}"
        
        resultados.append({
            'id_evento': evento.id_evento,
            'nombre_evento': evento.nombre_evento,
            'fecha_eliminacion': elim.fecha_eliminacion.strftime("%d/%m/%Y %H:%M:%S"),
            'motivo': elim.motivo_eliminacion,
            'estado': estado_texto,
            'eliminado_por': usuario.email if usuario else "Sistema",
            'tipo_eliminacion': tipo_elim
        })
    
    # Procesar eventos finalizados (estado 4)
    for evento in eventos_finalizados:
        usuario_evento = db.query(Usuario).filter(Usuario.id_usuario == evento.id_usuario).first()
        
        resultados.append({
            'id_evento': evento.id_evento,
            'nombre_evento': evento.nombre_evento,
            'fecha_eliminacion': evento.fecha_evento.strftime("%d/%m/%Y"),
            'motivo': 'Evento finalizado automáticamente (fecha pasada)',
            'estado': 'Finalizado',
            'eliminado_por': usuario_evento.email if usuario_evento else "Sistema",
            'tipo_eliminacion': 'finalizado'
        })
    
    return resultados

# ============================================================================
# NOTIFICACIONES
# ============================================================================
def marcar_notificacion_enviada(db: Session, id_eliminacion: int) -> bool:
    """
    Marca que ya se enviaron las notificaciones a los inscritos.
    """
    eliminacion = db.query(EliminacionEvento).filter(
        EliminacionEvento.id_eliminacion == id_eliminacion
    ).first()
    
    if eliminacion:
        eliminacion.notificacion_enviada = True
        db.flush()
        return True
    
    return False

def verificar_notificacion_enviada(db: Session, id_eliminacion: int) -> bool:
    """Verifica si ya se enviaron las notificaciones."""
    eliminacion = db.query(EliminacionEvento).filter(
        EliminacionEvento.id_eliminacion == id_eliminacion
    ).first()
    
    return eliminacion.notificacion_enviada if eliminacion else False

# ============================================================================
# ELIMINAR REGISTROS (Para rechazos)
# ============================================================================
def eliminar_registro_eliminacion(db: Session, id_evento: int) -> bool:
    """
    Elimina el registro de eliminación cuando el admin rechaza una solicitud.
    """
    eliminacion = db.query(EliminacionEvento).filter(
        EliminacionEvento.id_evento == id_evento, 
        EliminacionEvento.estado_solicitud == 'pendiente'
    ).first()
    
    if eliminacion:
        eliminacion.estado_solicitud = 'rechazada'  # ← Mantiene historial
        db.flush()
        return True
    
    return False