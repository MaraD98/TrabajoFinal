from sqlalchemy.orm import Session
from app.models.evento_solicitud_models import SolicitudPublicacion
from app.models.auth_models import Usuario
from fastapi import HTTPException, status


#Servicio para gestionar permisos sobre solicitudes de eventos.
#Centraliza toda la lógica de autorización.

class EventoPermisosService:
    #Maneja la lógica de permisos y autorizaciones
    
    # Constantes de roles
    ROL_ADMIN = 1
    ROL_SUPERVISOR = 2
    ROL_OPERARIO = 3
    ROL_CLIENTE = 4
    
    @staticmethod
    def es_admin_o_supervisor(usuario: Usuario) -> bool:
        return usuario.id_rol in [
            EventoPermisosService.ROL_ADMIN, 
            EventoPermisosService.ROL_SUPERVISOR
        ]
    
    @staticmethod
    def puede_ver_solicitud(
        solicitud: SolicitudPublicacion, 
        usuario: Usuario
    ) -> bool:
        if EventoPermisosService.es_admin_o_supervisor(usuario):
            return True
        
        # El creador puede ver su propia solicitud
        return solicitud.id_usuario == usuario.id_usuario
    
    @staticmethod
    def puede_editar_solicitud(
        solicitud: SolicitudPublicacion, 
        usuario: Usuario
    ) -> bool:
        if solicitud.id_usuario != usuario.id_usuario:
            return False
        
        return solicitud.id_estado == 1
    
    @staticmethod
    def puede_enviar_solicitud(
        solicitud: SolicitudPublicacion, 
        usuario: Usuario
    ) -> bool:
        return (
            solicitud.id_usuario == usuario.id_usuario and 
            solicitud.id_estado == 1
        )
    
    @staticmethod
    def puede_revisar_solicitud(usuario: Usuario) -> bool:
        return EventoPermisosService.es_admin_o_supervisor(usuario)
    
    @staticmethod
    def validar_puede_ver_solicitud(
        solicitud: SolicitudPublicacion, 
        usuario: Usuario
    ) -> None:
        if not EventoPermisosService.puede_ver_solicitud(solicitud, usuario):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver esta solicitud"
            )
    
    @staticmethod
    def validar_puede_editar_solicitud(
        solicitud: SolicitudPublicacion, 
        usuario: Usuario
    ) -> None:
        if solicitud.id_usuario != usuario.id_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el creador puede editar esta solicitud"
            )
        
        if solicitud.id_estado != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se pueden editar solicitudes en estado Borrador"
            )
    
    @staticmethod
    def validar_puede_enviar_solicitud(
        solicitud: SolicitudPublicacion, 
        usuario: Usuario
    ) -> None:
        if solicitud.id_usuario != usuario.id_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el creador puede enviar la solicitud"
            )
        
        if solicitud.id_estado != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La solicitud ya fue enviada anteriormente"
            )
    
    @staticmethod
    def validar_es_admin(usuario: Usuario) -> None:
        if not EventoPermisosService.es_admin_o_supervisor(usuario):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden acceder a este recurso"
            )