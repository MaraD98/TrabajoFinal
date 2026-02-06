import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getEventosCalendario, inscribirseEvento } from '../services/eventos'; 
import { useAuth } from '../context/auth-context'; 
import '../styles/Calendario.css';
import logoWakeUp from '../assets/wakeup-logo.png'; 

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
  // Asumimos que logout viene del hook, si no, puedes agregar la lógica manual
  const { user, logout } = useAuth(); 
  // const apiUrl = import.meta.env.VITE_API_URL; 
  const [localUserName] = useState<string>("Usuario"); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    cargarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, anio]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fechaParam = params.get('fecha');
    const idParam = params.get('id');

    if (fechaParam && idParam) {
        const [yearStr, monthStr] = fechaParam.split('-');
        const fechaDestino = new Date(Number(yearStr), Number(monthStr) - 1, 1);
        
        setFechaNavegacion(fechaDestino);
        setFechaSeleccionada(fechaParam); 
        setIdEventoSeleccionado(Number(idParam));

        if (user) {
            const nombreEncontrado = user.nombre_y_apellido || '';
            setNombre(nombreEncontrado);            
            setEmail(user.email || '');
            setTelefono(user.telefono || ''); 
        }

        setTimeout(() => {
            const panel = document.querySelector('.reserva-panel');
            if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 800); 
    }
  }, [location.search, user]); 

  const cargarEventos = async () => {
    setCargando(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = await getEventosCalendario(mes + 1, anio);
      setEventos(data || []);
    } catch (error) {
      console.error('Error al cargar eventos:', error);
      setEventos([]);
    } finally {
      setCargando(false);
    }
  };

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

  const obtenerEventosDelDia = (dia: number) => {
    const fechaBuscada = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return (Array.isArray(eventos) ? eventos : []).filter(evento => {
        if (!evento.fecha_evento) return false;
        const fechaEventoStr = String(evento.fecha_evento).substring(0, 10);
        return fechaEventoStr === fechaBuscada;
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

  const manejarClickDia = (dia: number, esPasado: boolean) => {
    if (esPasado) return;
    const fechaClick = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
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

    setEnviando(true);
    setMsgError(null);
    setMsgExito(null);

    if (!idEventoSeleccionado) return;

    try {
        await inscribirseEvento(idEventoSeleccionado);
        setMsgExito(`¡Inscripción exitosa a ${nombreEvento}!`);
        
        setTimeout(() => {
            setIdEventoSeleccionado(null);
            setMsgExito(null);
            cargarEventos();
        }, 2000);

    } catch (error: any) {
        console.error("Error en inscripción:", error);
        if (error.response && error.response.data && error.response.data.detail) {
            setMsgError(error.response.data.detail);
        } else {
            setMsgError("Ocurrió un error al procesar tu solicitud.");
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

  return (
    <div className="calendario-container">
        {/* --- HEADER --- */}
        <header className="cal-header">
            <div className="header-left">
                <Link to="/" className="btn-volver-inicio">
                    <span className="icono-flecha">←</span> 
                    <span className="texto-volver">VOLVER AL INICIO</span>
                </Link>
            </div>

            <div className="header-center">
                <div className="cal-branding-vertical">
                    <img src={logoWakeUp} alt="Wake Up Logo" className="cal-logo-centered" />
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

                {/* --- MENÚ DE USUARIO DESPLEGABLE --- */}
                {user ? (
                        <div className="user-menu-container" ref={dropdownRef}>
                            <button
                                className="user-menu-trigger"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span className="user-icon">👤</span>
                                <span className="user-name">{localUserName}</span>
                                <span className="dropdown-arrow">▼</span>
                            </button>

                            {isDropdownOpen && (
                                <div className="user-dropdown">
                                    <div className="dropdown-header">MI CUENTA</div>
                                    <Link to="/perfil" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                        👤 Mi Perfil
                                    </Link>

                                    <div className="dropdown-header">MIS EVENTOS</div>
                                    {/* Usamos ?tab=inscripciones para que PerfilPage sepa qué mostrar */}
                                    <Link to="/perfil?tab=inscripciones" className="dropdown-item">
                                         Inscriptos
                                    </Link>
                                    <Link to="/mis-eventos/creados" className="dropdown-item">
                                        Creados
                                    </Link>
                                    
                                    <div className="dropdown-divider"></div>
                                    
                                    <button
                                        onClick={logout}
                                        className="dropdown-item logout-button"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="hero-login-btn">INICIAR SESIÓN</Link>
                    )}
            </div>
        </header>

      <div className="calendario-wrapper">
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
                const fechaActualStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
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

        {fechaSeleccionada && (
          <div className="reserva-panel">
            <h3 className="panel-titulo no-select">
                RUTAS DEL <span className="fecha-destacada">{fechaSeleccionada}</span>
            </h3>
            
            {(() => {
                const diaNumero = parseInt(fechaSeleccionada.split('-')[2]);
                const eventosDia = obtenerEventosDelDia(diaNumero);
                
                if(eventosDia.length > 0) {
                    return (
                        <div className="lista-eventos-disponibles">
                            {eventosDia.map((e) => {
                                const estaAbierto = idEventoSeleccionado === e.id_evento;
                                const claseDificultad = getClaseDificultad(e.nombre_dificultad);
                                const cupoMaximo = e.cupo_maximo;
                                const cuposDisponibles = e.cupos_disponibles;
                                const esCupoLimitado = cupoMaximo !== undefined && cupoMaximo !== null && cupoMaximo > 0;

                                let estaAgotado = false;
                                if (esCupoLimitado) {
                                    if (cuposDisponibles !== undefined && cuposDisponibles !== null) {
                                        estaAgotado = cuposDisponibles <= 0;
                                    }
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
                                                        ? (cuposDisponibles !== null && cuposDisponibles !== undefined 
                                                            ? `🔥 Quedan: ${cuposDisponibles}` 
                                                            : `Cupo: ${cupoMaximo}`)
                                                        : '✅ Cupo Libre'
                                                    }
                                                </span>
                                            )}
                                        </div>

                                        {e.descripcion && (
                                            <div className="evento-descripcion">
                                                "{e.descripcion}"
                                            </div>
                                        )}
                                        
                                        {e.ubicacion && (
                                            <div className="evento-ubicacion">
                                                📍 {e.ubicacion}
                                                {e.lat && e.lng && (
                                                    <a href={`http://googleusercontent.com/maps.google.com/?q=${e.lat},${e.lng}`} target="_blank" rel="noopener noreferrer" className="ver-mapa-link">
                                                        Ver mapa
                                                    </a>
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
            })()}
          </div>
        )}
      </div>
    </div>
  );
}