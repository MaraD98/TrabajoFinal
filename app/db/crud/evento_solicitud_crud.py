# app/db/crud/evento_solicitud_crud.py
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.evento_solicitud_models import SolicitudPublicacion, TipoEvento, NivelDificultad
from app.models.auth_models import Usuario
from app.schemas.evento_solicitud_schema import SolicitudPublicacionCreate, RevisionSolicitud
from datetime import date
from typing import Optional

# Importaciones para Bajas
from app.models.registro_models import Evento
from app.models.eliminacion_models import EliminacionEvento

class Solicitud_PublicacionCRUD:
    
    # --- CREACIÓN ---
    @staticmethod
    def crear_solicitud_publicacion(
        db: Session, 
        solicitud: SolicitudPublicacionCreate, 
        id_usuario: int,
        id_estado_inicial: int = 2  # ✅ CAMBIO: DEFAULT 2 (Pendiente), antes era 1
    ) -> SolicitudPublicacion:
        db_solicitud = SolicitudPublicacion(
            nombre_evento=solicitud.nombre_evento,
            fecha_evento=solicitud.fecha_evento,
            ubicacion=solicitud.ubicacion,
            id_tipo=solicitud.id_tipo,
            id_dificultad=solicitud.id_dificultad,
            descripcion=solicitud.descripcion,
            costo_participacion=solicitud.costo_participacion,
            cupo_maximo=solicitud.cupo_maximo,  # ✅ AGREGAR
            lat=solicitud.lat,  # ✅ AGREGAR
            lng=solicitud.lng,  # ✅ AGREGAR
            id_usuario=id_usuario,
            fecha_solicitud=date.today(),
            id_estado=1,
            id_estado_solicitud=id_estado_inicial  # ✅ CAMBIO: Usar parámetro en vez de hardcoded 1
        )
        db.add(db_solicitud)
        db.commit()
        db.refresh(db_solicitud)
        return db_solicitud

    @staticmethod
    def obtener_solicitud_por_id(db: Session, id_solicitud: int) -> Optional[SolicitudPublicacion]:
        return db.query(SolicitudPublicacion).filter(SolicitudPublicacion.id_solicitud == id_solicitud).first()

    @staticmethod
    def obtener_solicitud_detallada(db: Session, id_solicitud: int):
        resultado = (
            db.query(SolicitudPublicacion, TipoEvento, NivelDificultad, Usuario)
            .join(TipoEvento, SolicitudPublicacion.id_tipo == TipoEvento.id_tipo)
            .join(NivelDificultad, SolicitudPublicacion.id_dificultad == NivelDificultad.id_dificultad)
            .join(Usuario, SolicitudPublicacion.id_usuario == Usuario.id_usuario)
            .filter(SolicitudPublicacion.id_solicitud == id_solicitud)
            .first()
        )
        
        if resultado:
            solicitud, tipo, dificultad, usuario = resultado
            solicitud.tipo_evento = tipo
            solicitud.nivel_dificultad = dificultad
            solicitud.usuario = usuario
            return solicitud
        return None

    @staticmethod
    def obtener_solicitudes_por_usuario(db: Session, id_usuario: int) -> list[SolicitudPublicacion]:
        solicitudes = (
            db.query(SolicitudPublicacion)
            .filter(SolicitudPublicacion.id_usuario == id_usuario)
            .order_by(desc(SolicitudPublicacion.fecha_solicitud))
            .all()
        )
        
        for sol in solicitudes:
            sol.tipo_evento = db.query(TipoEvento).filter(TipoEvento.id_tipo == sol.id_tipo).first()
            sol.nivel_dificultad = db.query(NivelDificultad).filter(NivelDificultad.id_dificultad == sol.id_dificultad).first()
            sol.usuario = db.query(Usuario).filter(Usuario.id_usuario == sol.id_usuario).first()
        
        return solicitudes

    @staticmethod
    def listar_solicitudes(db: Session, usuario_solicitante: Usuario, id_estado_solicitud: Optional[int] = None, skip: int = 0, limit: int = 100) -> dict:
        query = db.query(SolicitudPublicacion)
        
        es_admin_o_supervisor = usuario_solicitante.id_rol in [1, 2]
        if not es_admin_o_supervisor:
            query = query.filter(SolicitudPublicacion.id_usuario == usuario_solicitante.id_usuario)

        if id_estado_solicitud:
            query = query.filter(SolicitudPublicacion.id_estado_solicitud == id_estado_solicitud)
            
        total = query.count()
        solicitudes = query.order_by(desc(SolicitudPublicacion.fecha_solicitud)).offset(skip).limit(limit).all()
        
        for sol in solicitudes:
            sol.tipo_evento = db.query(TipoEvento).filter(TipoEvento.id_tipo == sol.id_tipo).first()
            sol.nivel_dificultad = db.query(NivelDificultad).filter(NivelDificultad.id_dificultad == sol.id_dificultad).first()
            sol.usuario = db.query(Usuario).filter(Usuario.id_usuario == sol.id_usuario).first()
        
        return {"total": total, "solicitudes": solicitudes}
    
    @staticmethod
    def obtener_solicitudes_pendientes(db: Session) -> list[SolicitudPublicacion]:
        solicitudes = (
            db.query(SolicitudPublicacion)
            .filter(SolicitudPublicacion.id_estado_solicitud == 2)
            .order_by(desc(SolicitudPublicacion.fecha_solicitud))
            .all()
        )
        
        for sol in solicitudes:
            sol.usuario = db.query(Usuario).filter(Usuario.id_usuario == sol.id_usuario).first()
            sol.tipo_evento = db.query(TipoEvento).filter(TipoEvento.id_tipo == sol.id_tipo).first()
            sol.nivel_dificultad = db.query(NivelDificultad).filter(NivelDificultad.id_dificultad == sol.id_dificultad).first()
        
        return solicitudes

    @staticmethod
    def obtener_solicitudes_aprobadas(db: Session) -> list[SolicitudPublicacion]:
        solicitudes = (
            db.query(SolicitudPublicacion)
            .filter(SolicitudPublicacion.id_estado_solicitud == 3)
            .order_by(desc(SolicitudPublicacion.fecha_evento))
            .all()
        )
        
        for sol in solicitudes:
            sol.usuario = db.query(Usuario).filter(Usuario.id_usuario == sol.id_usuario).first()
        
        return solicitudes

    @staticmethod
    def actualizar_estado_solicitud(db: Session, id_solicitud: int, revision: RevisionSolicitud) -> Optional[SolicitudPublicacion]:
        solicitud = db.query(SolicitudPublicacion).filter(SolicitudPublicacion.id_solicitud == id_solicitud).first()
        if not solicitud:
            return None
        
        solicitud.id_estado_solicitud = revision.id_estado_solicitud
        solicitud.observaciones_admin = revision.observaciones_admin
        
        if revision.id_estado_solicitud == 3:
            solicitud.id_estado = 3 
        elif revision.id_estado_solicitud == 4:
             solicitud.id_estado = 1 
        
        db.commit()
        db.refresh(solicitud)
        return solicitud

    @staticmethod
    def enviar_solicitud(db: Session, id_solicitud: int) -> Optional[SolicitudPublicacion]:
        solicitud = db.query(SolicitudPublicacion).filter(SolicitudPublicacion.id_solicitud == id_solicitud).first()
        if not solicitud:
            return None
        solicitud.id_estado_solicitud = 2
        solicitud.fecha_solicitud = date.today()
        db.commit()
        db.refresh(solicitud)
        return solicitud

    # --- GESTIÓN DE BAJAS (CORREGIDO) ---
    @staticmethod
    def obtener_bajas_pendientes(db: Session):
        """
        ✅ SOLUCIÓN DEFINITIVA: Busca eventos en estado 6 con o sin registro en eliminacion_evento
        
        Retorna un dict estructurado para facilitar el procesamiento posterior.
        """
        consulta = (
            db.query(
                Evento.id_evento,
                Evento.nombre_evento,
                Evento.fecha_creacion,
                Usuario.email,
                EliminacionEvento.id_eliminacion,
                EliminacionEvento.motivo_eliminacion,
                EliminacionEvento.fecha_eliminacion
            )
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
            .outerjoin(EliminacionEvento, Evento.id_evento == EliminacionEvento.id_evento)
            .filter(Evento.id_estado == 6)
            .order_by(desc(Evento.fecha_creacion))
            .all()
        )
        
        # Convertir a dict para facilitar procesamiento
        resultados = []
        for row in consulta:
            resultados.append({
                'id_evento': row.id_evento,
                'id_eliminacion': row.id_eliminacion or 0,
                'nombre_evento': row.nombre_evento,
                'motivo_eliminacion': row.motivo_eliminacion or 'Solicitud de baja (sin motivo registrado)',
                'fecha_eliminacion': row.fecha_eliminacion or row.fecha_creacion,
                'email': row.email
            })
        
        return resultados

    # --- CATÁLOGOS ---
    @staticmethod
    def obtener_tipos_evento(db: Session) -> list[TipoEvento]:
        return db.query(TipoEvento).all()
    
    @staticmethod
    def obtener_niveles_dificultad(db: Session) -> list[NivelDificultad]:
        return db.query(NivelDificultad).all()
    
    @staticmethod
    def verificar_usuario_existe(db: Session, id_usuario: int) -> bool:
        return db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first() is not None