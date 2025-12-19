from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.models.evento_solicitud_models import (SolicitudPublicacion,TipoEvento, NivelDificultad, EstadoSolicitud, Usuario)
from app.schemas.evento_solicitud_schema import (SolicitudPublicacionCreate, RevisionSolicitud)
from datetime import date
from typing import Optional

# ============== CRUD PARA HU-2.1 (Crear solicitud) ==============

class Solicitud_PublicacionCRUD:
    @staticmethod
    def crear_solicitud_publicacion(db: Session, solicitud: SolicitudPublicacionCreate, id_usuario: int) -> SolicitudPublicacion:
        db_solicitud = SolicitudPublicacion(
        nombre_evento=solicitud.nombre_evento,
        fecha_evento=solicitud.fecha_evento,
        ubicacion=solicitud.ubicacion,
        id_tipo=solicitud.id_tipo,
        id_dificultad=solicitud.id_dificultad,
        descripcion=solicitud.descripcion,
        costo_participacion=solicitud.costo_participacion,
        id_usuario=id_usuario,  # Asignar usuario autenticado
        fecha_solicitud=date.today(),
        id_estado=1,  # Borrador
        id_estado_solicitud=1  # Pendiente
        )
        db.add(db_solicitud)
        db.commit()
        db.refresh(db_solicitud)
        return db_solicitud

    @staticmethod
    def obtener_solicitud_por_id(db: Session, id_solicitud: int) -> Optional[SolicitudPublicacion]:
        return db.query(SolicitudPublicacion).filter(
        SolicitudPublicacion.id_solicitud == id_solicitud
        ).first()

 
    def obtener_solicitud_detallada(db: Session, id_solicitud: int):
        return db.query(SolicitudPublicacion).options(
        joinedload(SolicitudPublicacion.tipo_evento),
        joinedload(SolicitudPublicacion.nivel_dificultad),
        joinedload(SolicitudPublicacion.estado_evento),
        joinedload(SolicitudPublicacion.estado_solicitud),
        joinedload(SolicitudPublicacion.usuario)
    ).filter(
        SolicitudPublicacion.id_solicitud == id_solicitud
    ).first()


    def obtener_solicitudes_por_usuario(db: Session, id_usuario: int) -> list[SolicitudPublicacion]:
        return db.query(SolicitudPublicacion).filter(
        SolicitudPublicacion.id_usuario == id_usuario
    ).order_by(desc(SolicitudPublicacion.fecha_solicitud)).all()


 
 
    
    @staticmethod
    def listar_solicitudes(
        db: Session,
        id_estado_solicitud: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> dict:
        
        query = db.query(SolicitudPublicacion).options(
            joinedload(SolicitudPublicacion.usuario),
            joinedload(SolicitudPublicacion.tipo_evento),
            joinedload(SolicitudPublicacion.nivel_dificultad),
            joinedload(SolicitudPublicacion.estado_solicitud)
        )
        
        if id_estado_solicitud:
            query = query.filter(SolicitudPublicacion.id_estado_solicitud == id_estado_solicitud)
        total = query.count()
        solicitudes = query.order_by(desc(SolicitudPublicacion.fecha_solicitud)).offset(skip).limit(limit).all()
        
        return {"total": total, "solicitudes": solicitudes}
    
    @staticmethod
    def obtener_solicitudes_pendientes(db: Session) -> list[SolicitudPublicacion]:
        return db.query(SolicitudPublicacion).options(
            joinedload(SolicitudPublicacion.usuario),
            joinedload(SolicitudPublicacion.tipo_evento),
            joinedload(SolicitudPublicacion.nivel_dificultad)
        ).filter(
            SolicitudPublicacion.id_estado_solicitud == 1
        ).order_by(desc(SolicitudPublicacion.fecha_solicitud)).all()
    
    @staticmethod
    def actualizar_estado_solicitud(
        db: Session,
        id_solicitud: int,
        revision: RevisionSolicitud
    ) -> Optional[SolicitudPublicacion]:
        solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        
        if not solicitud:
            return None
        solicitud.id_estado_solicitud = revision.id_estado_solicitud
        solicitud.observaciones_admin = revision.observaciones_admin
        
        if revision.id_estado_solicitud == 2:  
            solicitud.id_estado = 3  # Publicado
        db.commit()
        db.refresh(solicitud)
        return solicitud
    
    @staticmethod
    def obtener_solicitudes_aprobadas(db: Session) -> list[SolicitudPublicacion]:
        return db.query(SolicitudPublicacion).options(
            joinedload(SolicitudPublicacion.usuario),
            joinedload(SolicitudPublicacion.tipo_evento)
        ).filter(
            SolicitudPublicacion.id_estado_solicitud == 2
        ).order_by(desc(SolicitudPublicacion.fecha_evento)).all()
    
   
    
    
    
    
    @staticmethod
    def obtener_tipos_evento(db: Session) -> list[TipoEvento]:
        return db.query(TipoEvento).all()
    
    @staticmethod
    def obtener_niveles_dificultad(db: Session) -> list[NivelDificultad]:
        return db.query(NivelDificultad).all()
    
    @staticmethod
    def verificar_usuario_existe(db: Session, id_usuario: int) -> bool:
        return db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first() is not None
