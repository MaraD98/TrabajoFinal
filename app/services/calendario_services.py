from datetime import date
import calendar

class CalendarioService:
    
    def obtener_rango_fechas(self, month: int, year: int):
        """
        Calcula la fecha de inicio y fin para filtrar eventos.
        Aplica la regla de no mostrar eventos pasados aunque sean del mes actual.
        """
        # 1. Obtenemos la fecha de hoy para comparar
        hoy = date.today()

        # 2. Calculamos el último día del mes solicitado
        # calendar.monthrange devuelve: (día_semana_inicio, total_días_mes)
        _, ultimo_dia_numero = calendar.monthrange(year, month)

        fecha_fin = date(year, month, ultimo_dia_numero)
        fecha_inicio_nominal = date(year, month, 1)

        # --- LÓGICA DE NEGOCIO (Tu lógica de "Vuelos") ---

        # CASO 1: El mes solicitado ya pasó completamente
        # (Ej: Piden Enero y hoy es Febrero)
        if fecha_fin < hoy:
            return None, None 

        # CASO 2: Es el mes actual 
        # (Ej: Piden Enero y hoy es 4 de Enero) -> Retornamos del 4 al 31.
        if month == hoy.month and year == hoy.year:
            return hoy, fecha_fin

        # CASO 3: Es un mes futuro
        # (Ej: Piden Febrero y hoy es Enero) -> Retornamos mes completo (1 al 28/29).
        return fecha_inicio_nominal, fecha_fin