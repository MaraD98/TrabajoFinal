from sqlalchemy.orm import Session
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD
from app.db.crud import registro_crud
from app.schemas.evento_solicitud_schema import SolicitudPublicacionCreate
from app.services.evento_permisos_service import EventoPermisosService
from app.models.auth_models import Usuario
from app.models.registro_models import Evento
from app.models.evento_solicitud_models import SolicitudPublicacion
from datetime import date, timedelta
from fastapi import HTTPException


class EventoSolicitudService:
    """
    Servicio para gestionar solicitudes de publicación de eventos.
    
    Ya NO incluye funciones de eliminación.
    Para eliminación, usar: app/services/eliminacion_services.py
    """
    
    # ========================================================================
    # VALIDACIONES BÁSICAS
    # ========================================================================
    
    @staticmethod
    def validar_fecha_evento(fecha_evento: date) -> None:
        """Valida que la fecha del evento sea al menos 1 día en el futuro"""
        dias_minimos = 1
        fecha_minima = date.today() + timedelta(days=dias_minimos)
        if fecha_evento < fecha_minima:
            raise HTTPException(
                status_code=400, 
                detail=f"La fecha debe ser al menos {dias_minimos} día en el futuro"
            )

    @staticmethod
    def validar_tipo_y_dificultad(db: Session, id_tipo: int, id_dificultad: int) -> None:
        """Valida que existan los tipos y dificultades"""
        pass  # Implementar si es necesario

    @staticmethod
    def validar_usuario(db: Session, id_usuario: int) -> None:
        """Valida que el usuario exista"""
        if not Solicitud_PublicacionCRUD.verificar_usuario_existe(db, id_usuario):
            raise HTTPException(
                status_code=404, 
                detail=f"Usuario {id_usuario} no encontrado"
            )

    # ========================================================================
    # GESTIÓN DE ALTAS (USUARIO)
    # ========================================================================
    
    @staticmethod
    def crear_solicitud(
        db: Session, 
        solicitud: SolicitudPublicacionCreate, 
        id_usuario: int,
        id_estado_inicial: int = 2  # ✅ CAMBIO: Agregar parámetro (default 2)
    ):
        """
        Crea una nueva solicitud de publicación.
        
        Args:
            id_estado_inicial: 1=Borrador (autoguardado), 2=Pendiente (envío normal)
        """
        EventoSolicitudService.validar_fecha_evento(solicitud.fecha_evento)
        EventoSolicitudService.validar_usuario(db, id_usuario)
        
        # ✅ CAMBIO: Pasar el estado inicial al CRUD
        return Solicitud_PublicacionCRUD.crear_solicitud_publicacion(
            db, 
            solicitud, 
            id_usuario,
            id_estado_inicial=id_estado_inicial  # ✅ NUEVO PARÁMETRO
        )
    # ========================================================================
    # ✅ NUEVO MÉTODO: Actualizar solicitud existente
    # ========================================================================
    @staticmethod
    def actualizar_solicitud(
        db: Session,
        id_solicitud: int,
        solicitud: SolicitudPublicacionCreate,
        id_usuario: int,
        enviar: bool = False
    ):
        """
        Actualiza una solicitud existente.
        
        Args:
            id_solicitud: ID de la solicitud a actualizar
            solicitud: Nuevos datos
            id_usuario: ID del usuario que actualiza
            enviar: Si True, cambia estado a 2 (Pendiente)
        """
        # Buscar solicitud
        solicitud_db = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        if not solicitud_db:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        # Verificar que sea el dueño
        if solicitud_db.id_usuario != id_usuario:
            raise HTTPException(status_code=403, detail="No tienes permiso para editar esta solicitud")
        
        # Validar fecha
        EventoSolicitudService.validar_fecha_evento(solicitud.fecha_evento)
        
        # Actualizar en BD
        return Solicitud_PublicacionCRUD.actualizar_solicitud(
            db,
            id_solicitud,
            solicitud,
            enviar=enviar
        )
    
    @staticmethod
    def obtener_mis_solicitudes(db: Session, id_usuario: int):
        """Obtiene todas las solicitudes de un usuario específico"""
        return Solicitud_PublicacionCRUD.obtener_solicitudes_por_usuario(db, id_usuario)

    @staticmethod
    def obtener_solicitud(db: Session, id_solicitud: int, usuario_actual: Usuario):
        """Obtiene una solicitud por ID"""
        solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        return solicitud

    @staticmethod
    def enviar_solicitud_para_revision(db: Session, id_solicitud: int, usuario_actual: Usuario):
        """Envía una solicitud para revisión del admin (1 → 2)"""
        solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        EventoPermisosService.validar_puede_enviar_solicitud(solicitud, usuario_actual)
        return Solicitud_PublicacionCRUD.enviar_solicitud(db, id_solicitud)

    # ========================================================================
    # GESTIÓN DE ALTAS (ADMIN)
    # ========================================================================
    
    @staticmethod
    def aprobar_solicitud_y_publicar(db: Session, id_solicitud: int, id_admin: int):
        """
        Admin aprueba una solicitud de alta y publica el evento.
        
        Flujo:
        1. Marcar solicitud como aprobada (estado 3)
        2. Crear el evento en la tabla eventos con estado PUBLICADO (3)
        """
        solicitud = db.query(SolicitudPublicacion).filter(
            SolicitudPublicacion.id_solicitud == id_solicitud
        ).first()
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        if solicitud.id_estado_solicitud == 3: 
            raise HTTPException(status_code=400, detail="Esta solicitud ya fue aprobada")

        # Marcar solicitud como aprobada
        solicitud.id_estado_solicitud = 3  
        solicitud.observaciones_admin = f"Aprobado por Admin ID {id_admin}"

        # Crear el evento publicado
        nuevo_evento = Evento(
            id_usuario          = solicitud.id_usuario,
            nombre_evento       = solicitud.nombre_evento,
            fecha_evento        = solicitud.fecha_evento,
            ubicacion           = solicitud.ubicacion,
            id_tipo             = solicitud.id_tipo,
            id_dificultad       = solicitud.id_dificultad,
            descripcion         = solicitud.descripcion,
            costo_participacion = solicitud.costo_participacion,
            lat                 = solicitud.lat,
            lng                 = solicitud.lng,
            cupo_maximo         = solicitud.cupo_maximo,
            id_estado           = 3  # PUBLICADO
        )

        try:
            db.add(nuevo_evento)
            db.add(solicitud)
            db.commit()
            db.refresh(nuevo_evento)
            return solicitud
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500, 
                detail=f"Error al publicar evento: {str(e)}"
            )