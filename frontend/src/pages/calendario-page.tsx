import { useState, useEffect, useRef, useCallback} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getEventosCalendario, inscribirseEvento } from '../services/eventos'; 
import { useAuth } from '../context/auth-context'; 
import '../styles/calendario.css';
import { Footer } from "../components/footer";
import { Navbar } from '../components/navbar';

interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion?: string;
  descripcion?: string;
  costo_participacion?: number;
  lat?: number;
  lng?: number;
  id_tipo?: number;
  nombre_tipo?: string;
  id_dificultad?: number;
  nombre_dificultad?: string;
  cupo_maximo?: number;
  cupos_disponibles?: number | null; 
  esta_lleno?: boolean; 
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS_DISPONIBLES = Array.from({ length: 6 }, (_, i) => ANIO_ACTUAL + i);

export default function CalendarioPage() {
  const location = useLocation(); 
  const navigate = useNavigate();
  
  const { user, getToken } = useAuth(); 
  
  const [fechaNavegacion, setFechaNavegacion] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(false);
    
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [idEventoSeleccionado, setIdEventoSeleccionado] = useState<number | null>(null);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  // Estados para mensajes
  const [msgExito, setMsgExito] = useState<string | null>(null);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const mes = fechaNavegacion.getMonth();
  const anio = fechaNavegacion.getFullYear();

  const hoyReal = new Date();
  hoyReal.setHours(0, 0, 0, 0);


  const ultimoPedidoId = useRef(0);
  const cargarEventos = useCallback(async () => {
    // Generamos un ID único para ESTA ejecución
    const pedidoActual = ultimoPedidoId.current + 1;
    ultimoPedidoId.current = pedidoActual;

    setCargando(true);
    
    try {
      console.log(`📡 Pidiendo eventos (ID: ${pedidoActual}) para: ${mes + 1}/${anio}`);
      
      // Pequeña pausa para que se sienta fluido (opcional)
      await new Promise(resolve => setTimeout(resolve, 300));

      const data = await getEventosCalendario(mes + 1, anio);

      if (pedidoActual !== ultimoPedidoId.current) {
          console.log(`🚫 Ignorando petición vieja (ID: ${pedidoActual})`);
          return;
      }

      console.log("✅ Datos válidos recibidos:", data);
      
      if (Array.isArray(data)) {
          setEventos(data);
      } else if (data && data.data && Array.isArray(data.data)) {
          setEventos(data.data);
      } else {
          setEventos([]);
      }

    } catch (error) {
      if (pedidoActual === ultimoPedidoId.current) {
          console.error('Error al cargar eventos:', error);
          setEventos([]);
      }
    } finally {
      if (pedidoActual === ultimoPedidoId.current) {
          setCargando(false);
      }
    }
  }, [mes, anio]); 


  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]); 
  

  // 1. CAMBIO: Lectura de URL (DD-MM-AAAA)
  // 2. LECTURA DE URL CORREGIDA Y NORMALIZADA
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fechaParam = params.get('fecha');
    const idParam = params.get('id');

    if (fechaParam) {
        const partes = fechaParam.split('-');
        
        let anioDestino = ANIO_ACTUAL;
        let mesDestino = mes;
        let diaDestino = 1;
        let fechaNormalizada = fechaParam; // Por defecto usamos la que viene

        // LÓGICA DE DETECCIÓN Y NORMALIZACIÓN
        if (partes.length === 3) {
            // Caso A: Formato ISO (YYYY-MM-DD) -> El año está al principio
            if (partes[0].length === 4) {
                anioDestino = Number(partes[0]);
                mesDestino = Number(partes[1]) - 1;
                diaDestino = Number(partes[2]);
                
                // ¡AQUÍ ESTÁ LA SOLUCIÓN!
                // Convertimos lo que viene de la URL al formato que tu app entiende (DD-MM-AAAA)
                fechaNormalizada = `${String(diaDestino).padStart(2, '0')}-${String(mesDestino + 1).padStart(2, '0')}-${anioDestino}`;
            } 
            // Caso B: Formato Latino (DD-MM-YYYY) -> El año está al final
            else {
                mesDestino = Number(partes[1]) - 1; 
                anioDestino = Number(partes[2]);
                diaDestino = Number(partes[0]);
                // En este caso el formato ya es correcto (DD-MM-AAAA)
                fechaNormalizada = fechaParam;
            }
        } 
        
        // Corrección de seguridad para años
        if (anioDestino < 100) anioDestino += 2000;

        // Ejecutar solo si el año es válido
        if (!isNaN(anioDestino) && !isNaN(mesDestino) && anioDestino > 2000) {
            
            // 1. Navegamos el calendario al mes correcto
            const fechaDestino = new Date(anioDestino, mesDestino, 1);
            setFechaNavegacion(fechaDestino);
            
            // 2. Guardamos la fecha SIEMPRE en formato DD-MM-AAAA
            setFechaSeleccionada(fechaNormalizada); 
            
            if (idParam) {
                setIdEventoSeleccionado(Number(idParam));
                
                if (user) {
                    setNombre(user.nombre_y_apellido || '');            
                    setEmail(user.email || '');
                    setTelefono(user.telefono || ''); 
                }

                setTimeout(() => {
                    const panel = document.querySelector('.reserva-panel');
                    if (panel) {
                        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 600); 
            }
        }
    }
  }, [location.search, user]);


  const obtenerDiasDelMes = () => {
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    
    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio === -1) diaSemanaInicio = 6;

    const dias: (number | null)[] = [];
    for (let i = 0; i < diaSemanaInicio; i++) dias.push(null);
    for (let dia = 1; dia <= diasEnMes; dia++) dias.push(dia);
    return dias;
  };

  // 2. CAMBIO: Comparación con formato DD-MM-AAAA
  const obtenerEventosDelDia = (dia: number) => {
    // Formato deseado: DD-MM-AAAA
    const fechaBuscada = `${String(dia).padStart(2, '0')}-${String(mes + 1).padStart(2, '0')}-${anio}`;
    
    return (Array.isArray(eventos) ? eventos : []).filter(evento => {
        if (!evento.fecha_evento) return false;
        
        // La API devuelve AAAA-MM-DD. La convertimos para comparar.
        const fechaIso = String(evento.fecha_evento).substring(0, 10); // AAAA-MM-DD
        const [y, m, d] = fechaIso.split('-');
        const fechaEventoFormateada = `${d}-${m}-${y}`; // DD-MM-AAAA
        
        return fechaEventoFormateada === fechaBuscada;
    });
  };

  const cambiarMesDropdown = (nuevoMes: number) => {
    const nuevaFecha = new Date(anio, nuevoMes, 1);
    setFechaNavegacion(nuevaFecha);
    setFechaSeleccionada(null);
    setIdEventoSeleccionado(null);
  };

  const cambiarAnioDropdown = (nuevoAnio: number) => {
    const nuevaFecha = new Date(nuevoAnio, mes, 1);
    setFechaNavegacion(nuevaFecha);
    setFechaSeleccionada(null);
    setIdEventoSeleccionado(null);
  };

  // 3. CAMBIO: Guardar selección como DD-MM-AAAA
  const manejarClickDia = (dia: number, esPasado: boolean) => {
    if (esPasado) return;
    // Construcción: DD-MM-AAAA
    const fechaClick = `${String(dia).padStart(2, '0')}-${String(mes + 1).padStart(2, '0')}-${anio}`;
    setFechaSeleccionada(fechaClick);
    setIdEventoSeleccionado(null);
    
    setTimeout(() => {
        const panel = document.querySelector('.reserva-panel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const toggleReserva = (id: number) => {
      setMsgError(null);
      setMsgExito(null);

      if (idEventoSeleccionado === id) {
          setIdEventoSeleccionado(null);
      } else {
          setIdEventoSeleccionado(id);
          if (user) {
              const nombreEncontrado = user.nombre_y_apellido || '';
              setNombre(nombreEncontrado);
              setEmail(user.email || '');
              setTelefono(user.telefono || '');
          } else {
              setNombre('');
              setTelefono('');
              setEmail('');
          }
      }
  };

  const manejarEnvioReserva = async (e: React.FormEvent, nombreEvento: string) => {
    e.preventDefault();
    
    if (!user) {
        setMsgError("Debes iniciar sesión para inscribirte.");
        return;
    }

    const token = getToken();
    if (!token) {
        setMsgError("No se encontró tu sesión. Por favor, vuelve a iniciar sesión.");
        navigate('/login');
        return;
    }

    setEnviando(true);
    setMsgError(null);
    setMsgExito(null);

    if (!idEventoSeleccionado) {
        setEnviando(false);
        return;
    }

    try {
        await inscribirseEvento(idEventoSeleccionado, token);
        
        setMsgExito(`¡Inscripción exitosa a ${nombreEvento}!`);
        
        setTimeout(() => {
            setIdEventoSeleccionado(null);
            setMsgExito(null);
            cargarEventos();
        }, 2000);

    } catch (error: any) {
        console.error("Error en inscripción:", error);

        // Manejo de errores detallado
        if (error.response) {
            const detalle = error.response.data?.detail || error.response.data?.message;

            if (error.response.status === 401) {
                setMsgError("Tu sesión expiró. Por favor, vuelve a iniciar sesión.");
                setTimeout(() => navigate('/login'), 2000);
            } else if (error.response.status === 403) {
                setMsgError("No tienes permisos para realizar esta acción.");
            } else if (error.response.status === 409) {
                setMsgError("Ya estás inscrito en este evento.");
            } else if (detalle) {
                setMsgError(detalle);
            } else {
                setMsgError("Error al procesar la inscripción.");
            }
        } else if (error.request) {
            setMsgError("No se pudo conectar con el servidor. Verifica tu conexión.");
        } else {
            setMsgError("Ocurrió un error inesperado.");
        }
    } finally {
        setEnviando(false);
    }
  };

  const dias = obtenerDiasDelMes();

  const getClaseDificultad = (dificultad?: string) => {
    const dif = dificultad?.toLowerCase() || '';
    if (dif.includes('experto') || dif.includes('avanzado')) return 'dificultad-experto';
    if (dif.includes('intermedio')) return 'dificultad-intermedio';
    if (dif.includes('principiante') || dif.includes('básico')) return 'dificultad-principiante';
    return 'dificultad-general';
  };

  const modoDetalle = idEventoSeleccionado !== null;
  return (
    <div className="calendario-container">
        <Navbar/>

        {!modoDetalle && (
            <header className="cal-header">
            <div className="header-center">
                <div className="cal-branding-vertical">
                    <div className="cal-title-wrapper-centered">
                        <h1 className="cal-title">CALENDARIO</h1>
                        <span className="cal-subtitle">DE EVENTOS</span>
                    </div>
                </div>
            </div>

            <div className="header-right">
                {/* SELECTORES DE FECHA */}
                <div className="select-wrapper">
                    <select 
                        value={mes} 
                        onChange={(e) => cambiarMesDropdown(Number(e.target.value))}
                        className="cal-select"
                    >
                        {MESES.map((nombreMes, index) => (
                            <option key={index} value={index}>{nombreMes}</option>
                        ))}
                    </select>
                </div>

                <div className="select-wrapper">
                    <select 
                        value={anio} 
                        onChange={(e) => cambiarAnioDropdown(Number(e.target.value))}
                        className="cal-select"
                    >
                        {ANIOS_DISPONIBLES.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>
        </header>
        )}

      <div className="calendario-wrapper">
      
      {!modoDetalle && (
          <>
            {cargando ? (
            <div className="calendario-cargando">
                <div className="wheel-spinning" style={{fontSize: '2rem'}}>☸</div>
                <p className="loader-texto no-select">Cargando eventos...</p>
            </div>
            ) : (
            <div className="calendario-grid-wrapper">
                <div className="calendario-grid">
                {DIAS_SEMANA.map(dia => <div key={dia} className="dia-semana-header no-select">{dia}</div>)}

                {dias.map((dia, index) => {
                    if (dia === null) return <div key={`vacio-${index}`} className="dia-celda dia-vacio"></div>;

                    const fechaCelda = new Date(anio, mes, dia);
                    fechaCelda.setHours(0, 0, 0, 0);

                    const esPasado = fechaCelda < hoyReal;
                    const esHoy = fechaCelda.getTime() === hoyReal.getTime();
                    const eventosDelDia = obtenerEventosDelDia(dia);
                    const tieneEventos = eventosDelDia.length > 0;
                    
                    // 4. CAMBIO: Comparación Grid en DD-MM-AAAA
                    const fechaActualStr = `${String(dia).padStart(2, '0')}-${String(mes + 1).padStart(2, '0')}-${anio}`;
                    const esSeleccionado = fechaSeleccionada === fechaActualStr;

                    return (
                    <div 
                        key={`dia-${dia}`} 
                        onClick={() => manejarClickDia(dia, esPasado)}
                        className={`dia-celda 
                        ${tieneEventos ? 'dia-con-eventos' : ''} 
                        ${esSeleccionado ? 'dia-seleccionado' : ''}
                        ${esPasado ? 'dia-pasado' : ''} 
                        ${esHoy ? 'dia-hoy' : ''}
                        `}
                    >
                        <div className="dia-numero">{dia}</div>
                        
                        {tieneEventos && (
                        <div className="icono-evento-bici">
                            <span style={{fontSize: '12px'}}>🚴</span>
                        </div>
                        )}
                    </div>
                    );
                })}
                </div>
            </div>
            )}
          </>
      )}

        {/* ========================================== */}
        {/* PANEL DE RESERVAS / DETALLE */}
        {/* ========================================== */}

      {(fechaSeleccionada || idEventoSeleccionado) && (
        <div className={modoDetalle ? "reserva-panel modo-full-screen" : "reserva-panel"}>
          
          {modoDetalle && (
            <button 
                className="btn-volver-calendario"
                onClick={() => {
                    setIdEventoSeleccionado(null);
                    navigate('/calendario'); 
                }}
            >
                ← Volver al Calendario
            </button>
          )}

            <h3 className="panel-titulo no-select">
                {modoDetalle 
                    ? 'COMPLETA TU INSCRIPCIÓN' 
                    : <span>RUTAS DEL <span className="fecha-destacada">{fechaSeleccionada}</span></span>
                }
            </h3>
            
            {cargando ? (
                <div className="calendario-cargando" style={{padding: '3rem 0', textAlign: 'center'}}>
                    <div className="wheel-spinning" style={{fontSize: '2rem', display: 'inline-block'}}>☸</div>
                    <p className="loader-texto no-select" style={{marginTop: '10px'}}>Cargando evento...</p>
                </div>
            ) : (
            (() => {
                if (!fechaSeleccionada) return null;

                // 5. CAMBIO: El día ahora está en la posición 0 (DD-MM-AAAA)
                const diaNumero = parseInt(fechaSeleccionada.split('-')[0]);
                const eventosDia = obtenerEventosDelDia(diaNumero);
                
                if(eventosDia.length > 0) {
                    return (
                        <div className="lista-eventos-disponibles">
                            {eventosDia.map((e) => {
                                const estaAbierto = idEventoSeleccionado === e.id_evento;
                                const claseDificultad = getClaseDificultad(e.nombre_dificultad);
                                const esCupoLimitado = e.cupo_maximo !== undefined && e.cupo_maximo !== null && e.cupo_maximo > 0;
                                
                                let estaAgotado = false;
                                if (esCupoLimitado && e.cupos_disponibles !== undefined && e.cupos_disponibles !== null) {
                                    estaAgotado = e.cupos_disponibles <= 0;
                                }

                                return (
                                <div key={e.id_evento} className={`evento-card ${estaAbierto ? 'abierto' : ''}`}>
                                    <div className="no-select">
                                        <div className="evento-cabecera">
                                            <div className="evento-titulo">{e.nombre_evento}</div>
                                            <div className="evento-precio">
                                                {e.costo_participacion && e.costo_participacion > 0 
                                                    ? `$${e.costo_participacion}`
                                                    : 'GRATIS'}
                                            </div>
                                        </div>

                                        <div className="evento-badges">
                                            <span className={`badge-dificultad ${claseDificultad}`}>
                                                {e.nombre_dificultad || 'General'}
                                            </span>
                                            <span className="badge-tipo">
                                                {e.nombre_tipo || 'Ruta'}
                                            </span>
                                            
                                            {estaAgotado ? (
                                                <span className="badge-cupo agotado" style={{backgroundColor: '#ff4444', color: 'white', border: '1px solid #ff0000'}}>
                                                    ⛔ ¡AGOTADO!
                                                </span>
                                            ) : (
                                                <span className="badge-cupo" style={!esCupoLimitado ? {backgroundColor: '#28a745', color: 'white'} : {}}>
                                                    {esCupoLimitado 
                                                        ? (e.cupos_disponibles !== null && e.cupos_disponibles !== undefined 
                                                            ? `🔥 Quedan: ${e.cupos_disponibles}` 
                                                            : `Cupo: ${e.cupo_maximo}`)
                                                        : '✅ Cupo Libre'
                                                    }
                                                </span>
                                            )}
                                        </div>

                                        {e.descripcion && (
                                            <div className="evento-descripcion">"{e.descripcion}"</div>
                                        )}
                                        
                                        {e.ubicacion && (
                                            <div className="evento-ubicacion">
                                                📍 {e.ubicacion}
                                                {e.lat && e.lng && (
                                                    <a href={`/mapa`} rel="noopener noreferrer" className="ver-mapa-link">Ver mapa</a>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="evento-acciones">
                                            <button 
                                                onClick={() => toggleReserva(e.id_evento)}
                                                disabled={estaAgotado}
                                                className={`btn-accion ${estaAbierto ? 'cancelar' : 'inscribir'}`}
                                                style={estaAgotado ? { opacity: 0.5, cursor: 'not-allowed', background: '#555', borderColor: '#555' } : {}}
                                            >
                                                {estaAgotado ? 'SIN LUGAR' : (estaAbierto ? 'CERRAR' : 'INSCRIBIRME')}
                                            </button>
                                    </div>

                                    {estaAbierto && (
                                        <div className="formulario-container">
                                            <h4 className="formulario-titulo no-select">
                                                {user ? 'Tus Datos (Autocompletado)' : 'Ingresa tus Datos'}
                                            </h4>

                                            {msgExito && <div style={{padding: '10px', background: 'rgba(204, 255, 0, 0.2)', color: '#ccff00', border: '1px solid #ccff00', borderRadius: '4px', marginBottom: '10px', fontWeight: 'bold', textAlign: 'center'}}>{msgExito}</div>}
                                            {msgError && <div style={{padding: '10px', background: 'rgba(255, 68, 68, 0.2)', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '4px', marginBottom: '10px', fontWeight: 'bold', textAlign: 'center'}}>{msgError}</div>}
                                            
                                            <form className="reserva-form" onSubmit={(evt) => manejarEnvioReserva(evt, e.nombre_evento)}>
                                                <div className="form-grupo">
                                                    <input 
                                                        type="text" 
                                                        value={nombre} 
                                                        onChange={(ev) => setNombre(ev.target.value)} 
                                                        required 
                                                        placeholder="Nombre Completo" 
                                                        readOnly={!!user && nombre.trim().length > 0}
                                                        style={(!!user && nombre.trim().length > 0) ? { opacity: 0.7, cursor: 'not-allowed', background: '#222' } : {}}
                                                    />
                                                </div>
                                                <div className="form-grupo">
                                                    <input 
                                                        type="tel" 
                                                        value={telefono} 
                                                        onChange={(ev) => setTelefono(ev.target.value)} 
                                                        placeholder="Teléfono (Opcional)" 
                                                    />
                                                </div>
                                                <div className="form-grupo">
                                                    <input 
                                                        type="email" 
                                                        value={email} 
                                                        onChange={(ev) => setEmail(ev.target.value)} 
                                                        required 
                                                        placeholder="Email" 
                                                        readOnly={!!user && email.trim().length > 0}
                                                        style={(!!user && email.trim().length > 0) ? { opacity: 0.7, cursor: 'not-allowed', background: '#222' } : {}}
                                                    />
                                                </div>
                                                <button type="submit" className="btn-confirmar" disabled={enviando}>
                                                    {enviando ? 'ENVIANDO...' : 'CONFIRMAR INSCRIPCIÓN'}
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    );
                } else {
                    return <p className="mensaje-vacio">No hay eventos programados para este día.</p>;
                }
            })()
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}