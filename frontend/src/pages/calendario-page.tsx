import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// import axios from 'axios'; 
import { getEventosCalendario } from '../services/eventos'; 
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
  const { user } = useAuth();
  // const apiUrl = import.meta.env.VITE_API_URL; // Descomentar cuando uses axios

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
            const nombreEncontrado = user.nombre_y_apellido || user.nombre || '';
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
              const nombreEncontrado = user.nombre_y_apellido || user.nombre || '';
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
    setEnviando(true);
    setMsgError(null);
    setMsgExito(null);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const datosInscripcion = {
        id_evento: idEventoSeleccionado,
        nombre_completo: nombre,
        email: email,
        telefono: telefono,
        id_usuario: user ? user.id_usuario : null
    };

    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setMsgExito(`¡Inscripción exitosa a ${nombreEvento}!`);
        setTimeout(() => {
            setIdEventoSeleccionado(null);
            setMsgExito(null);
        }, 2000);

    } catch (error: any) {
        console.error("Error en inscripción:", error);
        setMsgError("Ocurrió un error al procesar tu solicitud.");
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
        {/* --- HEADER REDISEÑADO --- */}
        <header className="cal-header">
            
            {/* 1. IZQUIERDA: Botón Volver */}
            <div className="header-left">
                <Link to="/" className="btn-volver-inicio">
                    <span className="icono-flecha">←</span> 
                    <span className="texto-volver">VOLVER AL INICIO</span>
                </Link>
            </div>

            {/* 2. CENTRO: Branding (Logo y Título) */}
            <div className="header-center">
                <div className="cal-branding-vertical">
                    <img src={logoWakeUp} alt="Wake Up Logo" className="cal-logo-centered" />
                    <div className="cal-title-wrapper-centered">
                        <h1 className="cal-title">CALENDARIO</h1>
                        <span className="cal-subtitle">DE EVENTOS</span>
                    </div>
                </div>
            </div>

            {/* 3. DERECHA: Controles */}
            <div className="header-right">
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

      <div className="calendario-wrapper">
        {cargando ? (
          <div className="calendario-cargando">
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
                                            <span className="badge-cupo">
                                                 {e.cupo_maximo ? `Cupo: ${e.cupo_maximo}` : 'Cupo Libre'}
                                            </span>
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
                                            className={`btn-accion ${estaAbierto ? 'cancelar' : 'inscribir'}`}
                                        >
                                            {estaAbierto ? 'CERRAR' : 'INSCRIBIRME'}
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
                                                    {enviando ? 'PROCESANDO...' : 'CONFIRMAR ASISTENCIA'}
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )
                } else {
                    return <p className="mensaje-vacio no-select">No hay salidas programadas para hoy.</p>
                }
            })()}
          </div>
        )}
      </div>
    </div>
  );
}