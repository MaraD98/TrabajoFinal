# app/api/api.py
from fastapi import APIRouter, Depends, HTTPException, status, Query # Importamos Query para los filtros
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.api.admin_eventos import get_current_user
from app.db.database import get_db
from app.core.security import security
from app.models.registro_models import Evento
from app.services.reportes_services import ReporteService
from fastapi.responses import StreamingResponse
from io import StringIO
import csv
from app.models.auth_models import Usuario
from app.models.registro_models import Evento


router = APIRouter(prefix="/reportes", tags=["Reportes"])

@router.get("/", summary="Obtener reportes según rol")
def obtener_reportes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    anio: int = Query(None, description="Año para filtrar"), # Filtro opcional
    mes: int = Query(None, description="Mes para filtrar")    # Filtro opcional
):
    if current_user.id_rol == 1:
        return ReporteService.reportes_admin(db, anio=anio, mes=mes) # Pasamos filtros
    elif current_user.id_rol == 2:
        return ReporteService.reportes_supervisor(db, current_user.id_usuario, anio=anio, mes=mes) # Pasamos filtros
    elif current_user.id_rol == 3:
        return ReporteService.reportes_operario(db, current_user.id_usuario)
    elif current_user.id_rol == 4:
        return ReporteService.reportes_cliente(db, current_user.id_usuario)
    else:
        raise HTTPException(status_code=403, detail="Rol no autorizado")


# EXPORTACION DE REPORTES 

@router.get("/export", summary="Exportar reportes en CSV")
def export_reportes(
    tipo: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Mapeo de roles permitidos para cada tipo de reporte
    roles_permitidos = {
        "total_eventos": [2],
        "eventos_por_estado": [2, 3],
        "eventos_por_usuario": [2],
        "eventos_por_mes": [2],
        "usuarios_total": [1],
        "usuarios_por_rol": [1],
        "eventos_por_tipo": [1, 2], 
        "eventos_por_dificultad": [1, 2], 
        "solicitudes_externas": [2],
        "mis_eventos_total": [2,3,4],
        "mis_eventos_por_estado": [2,3,4],
        "mis_inscripciones": [2,3,4],
        "mis_notificaciones": [2,3,4],
        "eventos_por_ubicacion": [1,2] 
    }

    if tipo not in roles_permitidos:
        raise HTTPException(status_code=400, detail="Tipo de reporte no válido")
    
    # Validación de rol (Rol 1 es Admin y tiene acceso a todo lo de roles_permitidos)
    es_admin = current_user.id_rol == 1
    tiene_permiso = current_user.id_rol in roles_permitidos.get(tipo, [])

    if not es_admin and not tiene_permiso:
        raise HTTPException(status_code=403, detail="No tienes permisos para exportar este reporte")
    
    # Inicializamos variables
    data = []
    fieldnames = []

    # Generar datos según tipo
    if tipo == "total_eventos":
        total_eventos = db.query(func.count(Evento.id_evento)).scalar()
        data = [{"total_eventos": total_eventos}]
        fieldnames = ["total_eventos"]

    if current_user.id_rol == 1:
        # Ahora pasamos el ID para que el Admin también vea sus "Mis Eventos"
        data = ReporteService.reportes_admin(db, current_user.id_usuario)

    elif tipo == "eventos_por_estado":
        resultados = db.query(Evento.id_estado, func.count(Evento.id_evento)).group_by(Evento.id_estado).all()
        data = [{"estado": estado, "cantidad": cantidad} for estado, cantidad in resultados]
        fieldnames = ["estado", "cantidad"]

    elif tipo == "eventos_por_usuario":
        resultados = db.query(Evento.id_usuario, func.count(Evento.id_evento)).group_by(Evento.id_usuario).all()
        data = [{"usuario": usuario, "cantidad": cantidad} for usuario, cantidad in resultados]
        fieldnames = ["usuario", "cantidad"]

    elif tipo == "eventos_por_mes":
        resultados = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).group_by("anio", "mes").all()
        data = [{"anio": int(anio), "mes": int(mes), "cantidad": cantidad} for anio, mes, cantidad in resultados]
        fieldnames = ["anio", "mes", "cantidad"]

    elif tipo == "usuarios_total":
        usuarios_total = db.query(func.count(Usuario.id_usuario)).scalar()
        data = [{"usuarios_total": usuarios_total}]
        fieldnames = ["usuarios_total"]

    elif tipo == "usuarios_por_rol":
        resultados = db.query(Usuario.id_rol, func.count(Usuario.id_usuario)).group_by(Usuario.id_rol).all()
        data = [{"rol": rol, "cantidad": cantidad} for rol, cantidad in resultados]
        fieldnames = ["rol", "cantidad"]

    elif tipo == "eventos_por_tipo":
        resultados = db.query(Evento.tipo_evento, func.count(Evento.id_evento)).group_by(Evento.tipo_evento).all()
        data = [{"tipo": tipo_evento, "cantidad": cantidad} for tipo_evento, cantidad in resultados]
        fieldnames = ["tipo", "cantidad"]

    if tipo == "solicitudes_externas": 
        data = ReporteService.reportes_supervisor(db, current_user.id_usuario)["solicitudes_externas"]
        fieldnames = ["estado", "cantidad"]

    elif tipo == "mis_eventos_total":
        total = db.query(func.count(Evento.id_evento)).filter(Evento.id_usuario == current_user.id_usuario).scalar()
        data = [{"mis_eventos_total": total}]
        fieldnames = ["mis_eventos_total"]

    elif tipo == "mis_eventos_por_estado":
        resultados = db.query(Evento.id_estado, func.count(Evento.id_evento)).filter(Evento.id_usuario == current_user.id_usuario).group_by(Evento.id_estado).all()
        data = [{"estado": estado, "cantidad": cantidad} for estado, cantidad in resultados]
        fieldnames = ["estado", "cantidad"]

    elif tipo == "mis_inscripciones":
        # Placeholder: depende de tu modelo de inscripciones
        data = [{"evento": "Carrera 5K", "estado": "Inscripto"}]
        fieldnames = ["evento", "estado"]

    elif tipo == "mis_notificaciones":
        # Placeholder: depende de tu modelo de notificaciones
        data = [{"mensaje": "Tu evento fue aprobado"}]
        fieldnames = ["mensaje"]

    # --- AGREGADO AL FINAL: REPORTE DIFICULTAD ---
    elif tipo == "eventos_por_dificultad":
        # Obtenemos la data usando el service para asegurar consistencia
        data = ReporteService.reportes_admin(db)["eventos_por_dificultad"]
        fieldnames = ["dificultad", "cantidad"]

    elif tipo == "eventos_por_ubicacion":
        if current_user.id_rol == 1:
            reporte = ReporteService.reportes_admin(db)
        else:
            reporte = ReporteService.reportes_supervisor(db, current_user.id_usuario)

        data = reporte.get("eventos_por_ubicacion", [])
        fieldnames = ["ubicacion", "cantidad"]


    # Crear CSV en memoria
    output = StringIO()
    if fieldnames:
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    else:
        # Fallback por si data viene vacío para no romper el CSV
        output.write("Sin datos disponibles para este reporte")
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={tipo}.csv"}
    )