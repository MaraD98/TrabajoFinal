from sqlalchemy.orm import Session
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD
from app.schemas.evento_solicitud_schema import SolicitudPublicacionCreate, SolicitudBorradorCreate
from app.services.evento_permisos_service import EventoPermisosService
from app.models.auth_models import Usuario
from app.models.registro_models import Evento
from app.models.evento_solicitud_models import SolicitudPublicacion
from datetime import date, timedelta
from fastapi import HTTPException
from typing import Union


class EventoSolicitudService:

    # ========================================================================
    # VALIDACIONES
    # ========================================================================

    @staticmethod
    def validar_fecha_evento(fecha_evento: date) -> None:
        fecha_minima = date.today() + timedelta(days=1)
        if fecha_evento < fecha_minima:
            raise HTTPException(
                status_code=400,
                detail="La fecha debe ser al menos 1 día en el futuro"
            )

    @staticmethod
    def validar_usuario(db: Session, id_usuario: int) -> None:
        if not Solicitud_PublicacionCRUD.verificar_usuario_existe(db, id_usuario):
            raise HTTPException(status_code=404, detail=f"Usuario {id_usuario} no encontrado")

    # ========================================================================
    # CREAR SOLICITUD
    # Acepta tanto SolicitudPublicacionCreate (envío real) como
    # SolicitudBorradorCreate (borrador — campos opcionales)
    # ========================================================================

    @staticmethod
    def crear_solicitud(
        db: Session,
        solicitud: Union[SolicitudPublicacionCreate, SolicitudBorradorCreate],
        id_usuario: int,
        id_rol: int,
        enviar: bool = True
    ):
        """
        Crea una nueva solicitud.

        - enviar=False: Guarda borrador, sin validaciones de negocio sobre campos vacíos.
        - enviar=True:  Envía para revisión, valida fecha y duplicados.

        Admin/Supervisor (rol 1,2): auto-aprueba y publica evento inmediatamente.
        Externo (rol 3,4): queda pendiente de aprobación manual.
        """
        EventoSolicitudService.validar_usuario(db, id_usuario)

        # Solo validar fecha y duplicados cuando se envía de verdad
        if enviar:
            if solicitud.fecha_evento:
                EventoSolicitudService.validar_fecha_evento(solicitud.fecha_evento)

            if solicitud.nombre_evento:
                if Solicitud_PublicacionCRUD.existe_solicitud_activa(db, id_usuario, solicitud.nombre_evento):
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            f"Ya existe una solicitud activa con el nombre '{solicitud.nombre_evento}'. "
                            f"Revisá tus solicitudes pendientes o borradores antes de crear una nueva."
                        )
                    )

        # Estado inicial: 1=Borrador, 2=Pendiente
        id_estado_inicial = 2 if enviar else 1

        nueva_solicitud = Solicitud_PublicacionCRUD.crear_solicitud_publicacion(
            db=db,
            solicitud=solicitud,
            id_usuario=id_usuario,
            id_estado_inicial=id_estado_inicial
        )

        # Auto-aprobación para admin/supervisor cuando envían
        if enviar and id_rol in [1, 2]:
            return EventoSolicitudService._auto_aprobar_solicitud(
                db=db,
                solicitud=nueva_solicitud,
                id_admin=id_usuario
            )

        return nueva_solicitud

    # ========================================================================
    # ACTUALIZAR SOLICITUD (autoguardado / reenvío desde borradores)
    # ========================================================================

    @staticmethod
    def actualizar_solicitud(
        db: Session,
        id_solicitud: int,
        solicitud: Union[SolicitudPublicacionCreate, SolicitudBorradorCreate],
        id_usuario: int,
        enviar: bool = False
    ):
        """
        Actualiza una solicitud existente.

        - enviar=False: Actualiza los datos del borrador sin cambiar estado.
        - enviar=True:  Actualiza y cambia a estado Pendiente (2).
        """
        solicitud_db = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        if not solicitud_db:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        # ✅ Comparamos como int para evitar falso 403 por int vs str en el token
        if int(solicitud_db.id_usuario) != int(id_usuario):
            print(f"[403] actualizar_solicitud: solicitud {id_solicitud} "
                  f"pertenece a usuario {solicitud_db.id_usuario} (type={type(solicitud_db.id_usuario).__name__}), "
                  f"pero intentó modificarla usuario {id_usuario} (type={type(id_usuario).__name__})")
            raise HTTPException(status_code=403, detail="No tenés permiso para modificar esta solicitud")

        # Solo se pueden editar borradores (1) o pendientes (2)
        if solicitud_db.id_estado_solicitud not in [1, 2]:
            raise HTTPException(
                status_code=400,
                detail="Solo se pueden editar solicitudes en estado borrador o pendiente"
            )

        solicitud_actualizada = Solicitud_PublicacionCRUD.actualizar_solicitud(
            db=db,
            id_solicitud=id_solicitud,
            solicitud=solicitud,
            enviar=enviar
        )

        if not solicitud_actualizada:
            raise HTTPException(status_code=500, detail="Error al actualizar la solicitud")

        return solicitud_actualizada

    # ========================================================================
    # AUTO-APROBACIÓN (interno — solo para admin/supervisor)
    # ========================================================================

    @staticmethod
    def _auto_aprobar_solicitud(db: Session, solicitud: SolicitudPublicacion, id_admin: int):
        solicitud.id_estado_solicitud = 3
        solicitud.observaciones_admin = f"[AUTO-APROBADA] Creado por Admin/Supervisor ID {id_admin}"

        nuevo_evento = Evento(
            id_usuario=solicitud.id_usuario,
            nombre_evento=solicitud.nombre_evento,
            fecha_evento=solicitud.fecha_evento,
            ubicacion=solicitud.ubicacion,
            id_tipo=solicitud.id_tipo,
            id_dificultad=solicitud.id_dificultad,
            descripcion=solicitud.descripcion,
            costo_participacion=solicitud.costo_participacion,
            lat=solicitud.lat,
            lng=solicitud.lng,
            cupo_maximo=solicitud.cupo_maximo,
            id_estado=3
        )

        try:
            db.add(nuevo_evento)
            db.commit()
            db.refresh(solicitud)
            db.refresh(nuevo_evento)
            solicitud.evento_creado_id = nuevo_evento.id_evento
            return solicitud
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al auto-aprobar: {str(e)}")

    # ========================================================================
    # RESTO
    # ========================================================================

    @staticmethod
    def obtener_mis_solicitudes(db: Session, id_usuario: int):
        return Solicitud_PublicacionCRUD.obtener_solicitudes_por_usuario(db, id_usuario)

    @staticmethod
    def obtener_solicitud(db: Session, id_solicitud: int, usuario_actual: Usuario):
        solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        return solicitud

    @staticmethod
    def enviar_solicitud_para_revision(db: Session, id_solicitud: int, usuario_actual: Usuario):
        solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        EventoPermisosService.validar_puede_enviar_solicitud(solicitud, usuario_actual)
        return Solicitud_PublicacionCRUD.enviar_solicitud(db, id_solicitud)

    @staticmethod
    def aprobar_solicitud_y_publicar(db: Session, id_solicitud: int, id_admin: int):
        solicitud = db.query(SolicitudPublicacion).filter(
            SolicitudPublicacion.id_solicitud == id_solicitud
        ).first()

        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        if solicitud.id_estado_solicitud == 3:
            raise HTTPException(status_code=400, detail="Esta solicitud ya fue aprobada")

        solicitud.id_estado_solicitud = 3
        solicitud.observaciones_admin = f"Aprobado por Admin ID {id_admin}"

        nuevo_evento = Evento(
            id_usuario=solicitud.id_usuario,
            nombre_evento=solicitud.nombre_evento,
            fecha_evento=solicitud.fecha_evento,
            ubicacion=solicitud.ubicacion,
            id_tipo=solicitud.id_tipo,
            id_dificultad=solicitud.id_dificultad,
            descripcion=solicitud.descripcion,
            costo_participacion=solicitud.costo_participacion,
            lat=solicitud.lat,
            lng=solicitud.lng,
            cupo_maximo=solicitud.cupo_maximo,
            id_estado=3
        )

        try:
            db.add(nuevo_evento)
            db.add(solicitud)
            db.commit()
            db.refresh(nuevo_evento)
            return solicitud
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al publicar evento: {str(e)}")