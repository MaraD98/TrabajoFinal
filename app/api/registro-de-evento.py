import datetime

# Tesis Final - Implementación Historiograma de Usuario HU 1.1 y HU 1.2
# ----------------------------------------------------------------------
# HU 1.1: Acceso a validar motor que contenia validacion, aviso sistema. 
#         (Registro y estado inicial)
# HU 1.2: Inclusión de datos obligatorios, incluyendo validaciones.
# ----------------------------------------------------------------------

# --- Simulación de Funciones de Soporte (HU 1.1) ---

def check_authentication():
    """
    Simula la verificación de autenticación del usuario.
    (El organizador debe estar previamente autenticado para acceder).
    """
    print("-> Verificando autenticación de usuario...")
    # Simulación: True para acceder, False para denegar.
    user_authenticated = True 
    return user_authenticated

# --- Función de Validación de Fecha (Motor de Validación) ---

def validate_future_date(date_str):
    """
    Valida si una cadena de texto es una fecha válida (DD-MM-AAAA) y si es futura.
    """
    try:
        # Intentar parsear la fecha en formato DD-MM-AAAA
        event_date = datetime.datetime.strptime(date_str, '%d-%m-%Y').date()
        today = datetime.date.today()
        
        # Validar si la fecha es futura (Restricción: debe ser futura)
        if event_date > today:
            return True, event_date
        else:
            return False, "La fecha debe ser futura."
            
    except ValueError:
        return False, "Formato de fecha incorrecto o inválido (debe ser DD-MM-AAAA)."

# --- Función Principal de Registro de Evento (HU 1.1 y HU 1.2) ---

def register_event():
    """
    Implementa el flujo de registro de un nuevo evento con las validaciones de la tabla.
    """
    # 1. Verificación de Autenticación (HU 1.1)
    if not check_authentication():
        print("\nError: Usuario no autenticado. Acceso denegado.")
        return None

    # 2. Presentación del Formulario (Parte de HU 1.1)
    print("\n## Registro de Nuevo Evento ##")
    
    # Diccionario para guardar los datos obligatorios
    event_data = {}
    
    # Bandera para controlar si hay errores de validación
    is_valid = True
    
    # --- A. Captura y Validación del Nombre (Obligatorio, no vacío, Texto 100) ---
    nombre_evento = input("1. Nombre del Evento: ").strip()
    if not nombre_evento or len(nombre_evento) > 100:
        print("❌ Error: Nombre del evento es obligatorio y no debe exceder los 100 caracteres.")
        is_valid = False
    else:
        event_data['nombre'] = nombre_evento
        
    # --- B. Captura y Validación de la Fecha (Obligatoria, debe ser futura) ---
    fecha_str = input("2. Fecha (DD-MM-AAAA): ").strip()
    is_date_valid, date_result = validate_future_date(fecha_str)
    
    if not is_date_valid:
        print(f"❌ Error: {date_result}")
        is_valid = False
    else:
        # Almacenamos la fecha válida (en formato Date si se necesita, aquí usamos el str original)
        event_data['fecha'] = fecha_str 

    # --- C. Captura y Validación de la Ubicación (Obligatoria, Texto 150) ---
    ubicacion = input("3. Ubicación: ").strip()
    if not ubicacion or len(ubicacion) > 150:
        print("❌ Error: La ubicación es obligatoria y no debe exceder los 150 caracteres.")
        is_valid = False
    else:
        event_data['ubicacion'] = ubicacion
        
    # --- D. Captura y Validación del Tipo (Obligatorio, valores predefinidos) ---
    # Simplificación: En un sistema real se usaría un menú. Aquí, validamos contra un set.
    tipos_validos = {'carrera', 'paseo', 'entrenamiento'}
    tipo_evento = input(f"4. Tipo de Evento ({'/'.join(tipos_validos)}): ").strip().lower()
    
    if tipo_evento not in tipos_validos:
        print(f"❌ Error: El tipo de evento es obligatorio y debe ser uno de los predefinidos: {', '.join(tipos_validos)}.")
        is_valid = False
    else:
        event_data['tipo'] = tipo_evento
        
    # --- Resultado de las Validaciones (HU 1.2) ---
    if not is_valid:
        # Si el organizador deja un campo obligatorio vacío, el sistema no guarda (HU 1.2)
        print("\n🛑 El sistema no puede guardar el evento. Revise los errores anteriores.")
        return None
    else:
        # 3. Asignación del Estado Inicial y Aviso (HU 1.2 y HU 1.1)
        estado_inicial = "borrador" # Inicia como "borrador" (Texto 20)
        event_data['estado'] = estado_inicial
        
        # Simulación de registro exitoso
        print(f"\n✅ Evento '{event_data['nombre']}' registrado con éxito.")
        print(f"Estado del Evento: '{estado_inicial}' (Pendiente de validación/publicación).")
        
        # En este punto, se guardaría 'event_data' en la base de datos.
        return event_data

