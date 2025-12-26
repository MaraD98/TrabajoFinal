from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD
from app.schemas.evento_solicitud_schema import SolicitudPublicacionCreate
from app.services.evento_permisos_service import EventoPermisosService
from app.models.auth_models import Usuario
from datetime import date, timedelta
from fastapi import HTTPException, status
 
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
    
    @staticmethod
    def actualizar_solicitud(db: Session, id_solicitud: int, datos_actualizados: SolicitudPublicacionCreate, usuario_actual):
        # 1. Buscamos la solicitud y verificamos que sea del usuario
        # (Reutilizamos tu método existente que ya hace la búsqueda segura)
        solicitud_existente = EventoSolicitudService.obtener_solicitud(db, id_solicitud, usuario_actual)
        
        # 2. VALIDACIÓN CLAVE: Solo se edita si está "Pendiente"
        if solicitud_existente.id_estado_solicitud != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo puedes editar solicitudes que estén 'Pendientes'. Si ya fue revisada, no se puede modificar."
            )
            
        # 3. Validamos de nuevo las reglas de negocio con los datos nuevos
        # (Por si el usuario intenta poner una fecha pasada al editar)
        EventoSolicitudService.validar_fecha_evento(datos_actualizados.fecha_evento)
        EventoSolicitudService.validar_tipo_y_dificultad(db, datos_actualizados.id_tipo, datos_actualizados.id_dificultad)
        
        # 4. Si todo está bien, llamamos al CRUD para guardar
        # Importante capturar error de duplicado por si cambia el nombre a uno que ya existe
        try:
            return Solicitud_PublicacionCRUD.actualizar_solicitud_usuario(db, solicitud_existente, datos_actualizados)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nuevo nombre de evento que intentas usar ya existe."
            )
    @staticmethod
    def eliminar_solicitud(db: Session, id_solicitud: int, usuario_actual: Usuario):
        # 1. Buscar solicitud
        solicitud = EventoSolicitudService.obtener_solicitud(db, id_solicitud, usuario_actual)
        
        # 2. Verificar que sea el dueño
        if solicitud.id_usuario != usuario_actual.id_usuario:
            raise HTTPException(status_code=403, detail="No puedes eliminar una solicitud que no es tuya.")
            
        # 3. Regla de Oro: Solo borrar Borradores (4) o Pendientes (1)
        # Si ya está Aprobada (2) o Rechazada (3), no se toca (historial).
        if solicitud.id_estado_solicitud not in [1, 4]: 
            raise HTTPException(
                status_code=400, 
                detail="No se puede eliminar una solicitud que ya fue procesada (Aprobada o Rechazada)."
            )
            
        # 4. Eliminar
        Solicitud_PublicacionCRUD.eliminar_solicitud(db, solicitud)
        return {"detail": "Solicitud eliminada exitosamente"}
    
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

# Alias para compatibilidad (si los usas en otros lugares)
crear_solicitud_publicacion = Solicitud_PublicacionCRUD.crear_solicitud_publicacion
obtener_solicitud_por_id = Solicitud_PublicacionCRUD.obtener_solicitud_por_id
obtener_tipos_evento = Solicitud_PublicacionCRUD.obtener_tipos_evento
obtener_niveles_dificultad = Solicitud_PublicacionCRUD.obtener_niveles_dificultad
verificar_usuario_existe = Solicitud_PublicacionCRUD.verificar_usuario_existe
obtener_solicitudes_por_usuario = Solicitud_PublicacionCRUD.obtener_solicitudes_por_usuario