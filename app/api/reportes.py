from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.admin_eventos import get_current_user
from app.db.database import get_db
from app.services.reportes_services import ReporteService
from fastapi.responses import StreamingResponse
from io import StringIO
import csv

router = APIRouter(prefix="/reportes", tags=["Reportes"])

@router.get("/", summary="Obtener reportes según rol")
def obtener_reportes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    anio: int = Query(None, description="Año para filtrar"),
    mes: int = Query(None, description="Mes para filtrar")
):
    if current_user.id_rol == 1:
        return ReporteService.reportes_admin(db, anio=anio, mes=mes)
    elif current_user.id_rol == 2:
        return ReporteService.reportes_supervisor(db, current_user.id_usuario, anio=anio, mes=mes)
    elif current_user.id_rol == 3:
        return ReporteService.reportes_organizacion_externa(db, current_user.id_usuario)
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
        "total_eventos": [1, 2],
        "eventos_por_estado": [1, 2, 3],
        "eventos_por_usuario": [1, 2],
        "eventos_por_mes": [1, 2],
        "usuarios_total": [1],
        "usuarios_por_rol": [1],
        "eventos_por_tipo": [1, 2, 3], 
        "eventos_por_dificultad": [1, 2], 
        "solicitudes_externas": [2],
        "mis_eventos_total": [1, 2, 3, 4],
        "mis_eventos_por_estado": [1, 2, 3, 4],
        "mis_notificaciones": [1, 2, 3, 4],
        "eventos_por_ubicacion": [1, 2],
        "lista_eventos_detallada": [1, 2, 3] ,
        "mis_inscripciones": [4]
    }

    if tipo not in roles_permitidos:
        raise HTTPException(status_code=400, detail="Tipo de reporte no válido")
    
    # 2. Validación de permisos
    es_admin = current_user.id_rol == 1
    tiene_permiso = current_user.id_rol in roles_permitidos.get(tipo, [])

    if not es_admin and not tiene_permiso:
        raise HTTPException(status_code=403, detail="No tienes permisos para exportar este reporte")
    
    # 3. Obtención de datos centralizada (Lógica del Documento 2)
    # Llamamos al service una sola vez según el rol
    if current_user.id_rol == 1:
        data_completa = ReporteService.reportes_admin(db)
    elif current_user.id_rol == 2:
        data_completa = ReporteService.reportes_supervisor(db, current_user.id_usuario)
    elif current_user.id_rol == 3:
        data_completa = ReporteService.reportes_organizacion_externa(db, current_user.id_usuario)
    else:
        data_completa = ReporteService.reportes_cliente(db, current_user.id_usuario)

    # 4. Extracción de datos y fieldnames (Respetando Documento 1)
    data = []
    fieldnames = []

    if tipo == "total_eventos":
        data = [{"total_eventos": data_completa.get("total_eventos", 0)}]
        fieldnames = ["total_eventos"]

    elif tipo == "eventos_por_estado":
        data = data_completa.get("eventos_por_estado", [])
        fieldnames = ["estado", "cantidad"]

    elif tipo == "eventos_por_usuario":
        data = data_completa.get("eventos_por_usuario", [])
        fieldnames = ["usuario", "cantidad"]

    elif tipo == "eventos_por_mes":
        data = data_completa.get("eventos_por_mes", [])
        fieldnames = ["anio", "mes", "cantidad"]

    elif tipo == "usuarios_total":
        data = [{"usuarios_total": data_completa.get("usuarios_total", 0)}]
        fieldnames = ["usuarios_total"]

    elif tipo == "usuarios_por_rol":
        data = data_completa.get("usuarios_por_rol", [])
        fieldnames = ["rol", "cantidad"]

    elif tipo == "eventos_por_tipo":
        data = data_completa.get("eventos_por_tipo", data_completa.get("rendimiento_por_tipo", []))
        fieldnames = ["tipo", "cantidad"]

    elif tipo == "eventos_por_dificultad":
        data = data_completa.get("eventos_por_dificultad", [])
        fieldnames = ["dificultad", "cantidad"]

    elif tipo == "solicitudes_externas":
        data = data_completa.get("solicitudes_externas", [])
        fieldnames = ["estado", "cantidad"]

    elif tipo == "mis_eventos_total":
        data = [{"mis_eventos_total": data_completa.get("mis_eventos_total", 0)}]
        fieldnames = ["mis_eventos_total"]

    elif tipo == "mis_eventos_por_estado":
        data = data_completa.get("mis_eventos_por_estado", [])
        fieldnames = ["estado", "cantidad"]

    elif tipo == "eventos_por_ubicacion":
        data = data_completa.get("eventos_por_ubicacion", [])
        fieldnames = ["ubicacion", "cantidad"]

    # Desde aca empiezo con los reportes para organizacion externa
    elif tipo == "lista_eventos_detallada":
        data = data_completa.get("lista_eventos_detallada", [])
        fieldnames = ["id", "nombre", "fecha", "tipo", "reservas", "estado"]

    elif tipo == "mis_inscripciones":
        data = data_completa.get("mis_inscripciones", [])
        fieldnames = ["evento", "estado"]

    # 5. Generación del CSV (Lógica robusta)
    output = StringIO()
    if data:
        # extrasaction='ignore' evita errores si el service devuelve más campos de los que queremos exportar
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(data)
    else:
        output.write("Sin datos disponibles para este reporte")
    
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={tipo}.csv"}
    )