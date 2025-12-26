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
    
    # 1. Regla para ENVIAR
    @staticmethod
    def enviar_solicitud_para_revision(db: Session, id_solicitud: int, usuario_actual: Usuario):
        solicitud = EventoSolicitudService.obtener_solicitud(db, id_solicitud, usuario_actual)
        
        # Validación de dueño
        if solicitud.id_usuario != usuario_actual.id_usuario:
            raise HTTPException(status_code=403, detail="No puedes enviar una solicitud ajena.")
            
        # SOLO enviar si es Borrador (4).
        if solicitud.id_estado_solicitud != 4:
            raise HTTPException(
                status_code=400, 
                detail="Solo se pueden enviar solicitudes que están en Borrador."
            )
            
        return Solicitud_PublicacionCRUD.enviar_solicitud(db, id_solicitud)

    # 2. Regla para EDITAR (Estricta Gmail: Solo editas si no has enviado)
    @staticmethod
    def actualizar_solicitud(db: Session, id_solicitud: int, datos: SolicitudPublicacionCreate, usuario: Usuario):
        solicitud = EventoSolicitudService.obtener_solicitud(db, id_solicitud, usuario)
        
        if solicitud.id_usuario != usuario.id_usuario:
             raise HTTPException(status_code=403, detail="Acceso denegado")

        # Si ya la enviaste (es 1, 2 o 3), NO se edita. 
        # Tienes que borrarla y hacer otra, o esperar.
        if solicitud.id_estado_solicitud != 4:
            raise HTTPException(
                status_code=400,
                detail="Solo puedes editar solicitudes en 'Borrador'. Si ya la enviaste, no se puede modificar."
            )

        return Solicitud_PublicacionCRUD.actualizar_solicitud(db, id_solicitud, datos)

    # 3. Regla para ELIMINAR (Borradores o Pendientes)
    @staticmethod
    def eliminar_solicitud(db: Session, id_solicitud: int, usuario_actual: Usuario):
        solicitud = EventoSolicitudService.obtener_solicitud(db, id_solicitud, usuario_actual)
        
        if solicitud.id_usuario != usuario_actual.id_usuario:
            raise HTTPException(status_code=403, detail="No es tu solicitud.")
            
        # Permitimos borrar Borradores (4) para limpiar.
        # Permitimos borrar Pendientes (1) para "cancelar" el envío.
        if solicitud.id_estado_solicitud not in [1, 4]: 
            raise HTTPException(
                status_code=400, 
                detail="No se puede eliminar una solicitud que ya fue procesada (Aprobada o Rechazada)."
            )
            
        Solicitud_PublicacionCRUD.eliminar_solicitud(db, solicitud)

# Alias para compatibilidad (si los usas en otros lugares)
crear_solicitud_publicacion = Solicitud_PublicacionCRUD.crear_solicitud_publicacion
obtener_solicitud_por_id = Solicitud_PublicacionCRUD.obtener_solicitud_por_id
obtener_tipos_evento = Solicitud_PublicacionCRUD.obtener_tipos_evento
obtener_niveles_dificultad = Solicitud_PublicacionCRUD.obtener_niveles_dificultad
verificar_usuario_existe = Solicitud_PublicacionCRUD.verificar_usuario_existe
obtener_solicitudes_por_usuario = Solicitud_PublicacionCRUD.obtener_solicitudes_por_usuario