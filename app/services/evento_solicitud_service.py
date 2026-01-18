from sqlalchemy.orm import Session
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD
from app.schemas.evento_solicitud_schema import SolicitudPublicacionCreate
from app.services.evento_permisos_service import EventoPermisosService
from app.models.auth_models import Usuario
from datetime import date, timedelta
from fastapi import HTTPException, status
#  NUEVO: Importamos el modelo de destino (Evento) para poder crear el publicado
from app.models.registro_models import Evento 
#  NUEVO: Importamos el modelo de origen para buscarlo si es necesario
from app.models.evento_solicitud_models import SolicitudPublicacion
 
    #Servicio para manejar lógica de negocio de solicitudes de publicación
    
class EventoSolicitudService:
   
        #Valida que la fecha del evento sea al menos 1 días en el futuro.
        #Regla de negocio: tiempo mínimo para planificación.
        
    @staticmethod
    def validar_fecha_evento(fecha_evento: date) -> None:
        dias_minimos = 1
        fecha_minima = date.today() + timedelta(days=dias_minimos)
        
        if fecha_evento < fecha_minima:
            raise HTTPException( 
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha del evento debe ser al menos {dias_minimos} días en el futuro"
            )
            
    
    @staticmethod
    def validar_tipo_y_dificultad(db: Session, id_tipo: int, id_dificultad: int) -> None:
        tipos_validos = [tipo.id_tipo for tipo in Solicitud_PublicacionCRUD.obtener_tipos_evento(db)]
        dificultades_validas = [dif.id_dificultad for dif in Solicitud_PublicacionCRUD.obtener_niveles_dificultad(db)]
        
        if id_tipo not in tipos_validos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de evento inválido. Valores permitidos: {tipos_validos}"
            )
        
        if id_dificultad not in dificultades_validas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nivel de dificultad inválido. Valores permitidos: {dificultades_validas}"
            )
            
        
    
    @staticmethod
    def validar_usuario(db: Session, id_usuario: int) -> None:
    
       if not Solicitud_PublicacionCRUD.verificar_usuario_existe(db, id_usuario):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {id_usuario} no encontrado"
            )
    
    
    
    
        #Crea una nueva solicitud con todas las validaciones de negocio.
    @staticmethod
    def crear_solicitud(db: Session, solicitud: SolicitudPublicacionCreate, id_usuario: int):
        # Validaciones de negocio
        EventoSolicitudService.validar_fecha_evento(solicitud.fecha_evento)
        EventoSolicitudService.validar_tipo_y_dificultad(db, solicitud.id_tipo, solicitud.id_dificultad)
        EventoSolicitudService.validar_usuario(db, id_usuario)

        # Crear solicitud
        try:
            nueva_solicitud = Solicitud_PublicacionCRUD.crear_solicitud_publicacion(
                db, solicitud, id_usuario
            )
            return nueva_solicitud
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear la solicitud: {str(e)}"
            )

    #Obtiene una solicitud por el objeto usuario actual
    @staticmethod
    def obtener_solicitud(
        db: Session, 
        id_solicitud: int, 
        usuario_actual: Usuario  
    ):
        
        # 1. Buscamos la solicitud en la BD
        solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_detallada(db, id_solicitud)
        
        if not solicitud:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Solicitud con ID {id_solicitud} no encontrada"
            )
        
        # 2. VALIDAR PERMISOS USANDO TU SERVICE
        # Esto lanzará error 403 si el usuario no es el dueño ni admin
        EventoPermisosService.validar_puede_ver_solicitud(solicitud, usuario_actual)
        
        return solicitud
    
     #NUEVO: Obtiene todas las solicitudes creadas por el usuario autenticado.
     #No necesita validación de permisos porque es el propio usuario.
    @staticmethod
    def obtener_mis_solicitudes(db: Session, id_usuario: int):
       
        return Solicitud_PublicacionCRUD.obtener_solicitudes_por_usuario(db, id_usuario)
    
    # 1. Regla para ENVIAR
    @staticmethod
    def enviar_solicitud_para_revision(
        db: Session,
        id_solicitud: int,
        usuario_actual: Usuario
    ):
       
        # Obtener solicitud
        solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(
            db, id_solicitud
        )
        
        if not solicitud:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Solicitud con ID {id_solicitud} no encontrada"
            )
        
        # Validar permisos usando el Service de Permisos
        EventoPermisosService.validar_puede_enviar_solicitud(solicitud, usuario_actual)
        
        # Enviar solicitud (cambia id_estado de 1 a 2)
        solicitud_actualizada = Solicitud_PublicacionCRUD.enviar_solicitud(
            db, id_solicitud
        )
        
        if not solicitud_actualizada:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al enviar la solicitud"
            )
        
        return solicitud_actualizada

    @staticmethod
    def aprobar_solicitud_y_publicar(db: Session, id_solicitud: int, id_admin: int):
        """
        1. Cambia estado de solicitud a APROBADA (3).
        2. COPIA los datos a la tabla EVENTO con estado PUBLICADO (3).
        """
        
        # 1. Buscar la Solicitud
        solicitud = db.query(SolicitudPublicacion).filter(SolicitudPublicacion.id_solicitud == id_solicitud).first()
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        # Verificamos si ya estaba en estado 3 (Aprobada)
        if solicitud.id_estado_solicitud == 3: 
             raise HTTPException(status_code=400, detail="Esta solicitud ya fue aprobada anteriormente")

        # 2. Actualizar Estado de la Solicitud (Origen)
        solicitud.id_estado_solicitud = 3  
        solicitud.observaciones_admin = f"Aprobado por Admin ID {id_admin}"

        # 3. CREAR EL EVENTO PUBLICADO (Destino)
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
            id_estado           = 3  # Estado del EVENTO (Publicado)
        )

        try:
            db.add(nuevo_evento)
            db.add(solicitud)
            
            db.commit()
            db.refresh(nuevo_evento)
            
            return solicitud
            
        except Exception as e:
            db.rollback()
            print(f"Error al publicar evento: {e}")
            raise HTTPException(status_code=500, detail=f"Error interno al publicar el evento: {str(e)}")
        
    # ... (código existente de tus compañeros arriba) ...

    # =================================================================
    #  NUEVA LOGICA: ADMINISTRAR SOLICITUDES DE ELIMINACIÓN 4.1-4.2-4.3 (SOFT DELETE)
    # =================================================================
    
    @staticmethod
    def obtener_solicitudes_eliminacion_pendientes(db: Session):
        """
        Devuelve la lista de eventos que han solicitado baja.
        """
        # Importamos aquí para evitar ciclos
        from app.models.registro_models import EliminacionEvento, Evento
        from app.models.auth_models import Usuario

        # Hacemos un JOIN para traer datos del evento y del usuario que pide la baja
        consulta = (
            db.query(EliminacionEvento, Evento.nombre_evento, Usuario.email)
            .join(Evento, EliminacionEvento.id_evento == Evento.id_evento)
            .join(Usuario, EliminacionEvento.id_usuario == Usuario.id_usuario)
            .filter(EliminacionEvento.notificacion_enviada == False) # Usamos este flag o un campo 'estado' si tuvieras
            # OJO: Si no tienes un campo de estado en EliminacionEvento, 
            # asumimos que si el evento sigue en estado 3, la solicitud está pendiente.
            .filter(Evento.id_estado != 6) # Solo mostramos si el evento NO ha sido eliminado aún
            .all()
        )
        return consulta

    @staticmethod
    def aprobar_eliminacion_evento(db: Session, id_eliminacion: int, id_admin: int):
        """
        El Admin aprueba la solicitud -> El evento pasa a Estado 6 (Soft Delete).
        """
        from app.models.registro_models import EliminacionEvento, Evento
        
        # 1. Buscar la solicitud
        solicitud = db.query(EliminacionEvento).filter(EliminacionEvento.id_eliminacion == id_eliminacion).first()
        if not solicitud:
            raise Exception("Solicitud de eliminación no encontrada.")

        # 2. Buscar el evento asociado
        evento = db.query(Evento).filter(Evento.id_evento == solicitud.id_evento).first()
        if not evento:
            raise Exception("Evento asociado no encontrado.")

        # 3. APLICAR SOFT DELETE (Estado 6)
        evento.id_estado = 6 
        
        # 4. (Opcional) Marcar solicitud como procesada/notificada
        # Si usas el campo 'notificacion_enviada' como flag de 'Procesado':
        solicitud.notificacion_enviada = True 

        db.commit()
        db.refresh(evento)
        return evento

    @staticmethod
    def rechazar_eliminacion_evento(db: Session, id_eliminacion: int):
        """
        El Admin rechaza la baja. El evento se queda como estaba (Publicado/3).
        Solo borramos o marcamos la solicitud.
        """
        from app.models.registro_models import EliminacionEvento
        
        solicitud = db.query(EliminacionEvento).filter(EliminacionEvento.id_eliminacion == id_eliminacion).first()
        if not solicitud:
            raise Exception("Solicitud no encontrada.")

        # Opción A: Borrar la solicitud física de la tabla (si se rechazó, no hace falta guardarla)
        db.delete(solicitud)
        
        # Opción B: Si tuvieras un estado en esta tabla, lo pondrías en "Rechazado".
        # Como creo que no tienes esa columna, el delete es lo más limpio para "cancelar la solicitud".
        
        db.commit()
        return {"mensaje": "Solicitud de eliminación rechazada. El evento sigue activo."}
    
# Alias para compatibilidad (si los usas en otros lugares)
crear_solicitud_publicacion = Solicitud_PublicacionCRUD.crear_solicitud_publicacion
obtener_solicitud_por_id = Solicitud_PublicacionCRUD.obtener_solicitud_por_id
obtener_tipos_evento = Solicitud_PublicacionCRUD.obtener_tipos_evento
obtener_niveles_dificultad = Solicitud_PublicacionCRUD.obtener_niveles_dificultad
verificar_usuario_existe = Solicitud_PublicacionCRUD.verificar_usuario_existe
obtener_solicitudes_por_usuario = Solicitud_PublicacionCRUD.obtener_solicitudes_por_usuario