import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Asegúrate de tener instalado react-router-dom
import { getEventosCalendario } from '../services/eventos'; 
import '../styles/Calendario.css';
// IMPORTANTE: Ajusta la ruta de tu logo aquí
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

// Generamos un rango de años (Desde el actual hasta 5 años más)
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS_DISPONIBLES = Array.from({ length: 6 }, (_, i) => ANIO_ACTUAL + i);

export default function CalendarioPage() {
  const [fechaNavegacion, setFechaNavegacion] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(false);
  
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [idEventoSeleccionado, setIdEventoSeleccionado] = useState<number | null>(null);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const mes = fechaNavegacion.getMonth();
  const anio = fechaNavegacion.getFullYear();

  const hoyReal = new Date();
  hoyReal.setHours(0, 0, 0, 0);

  useEffect(() => {
    cargarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, anio]);

  const cargarEventos = async () => {
    setCargando(true);
    try {
      // Simulación de carga visual
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

  // --- NUEVA LÓGICA DE NAVEGACIÓN POR DROPDOWN ---
  const cambiarMesDropdown = (nuevoMes: number) => {
    // Al cambiar mes, mantenemos el año, reseteamos al día 1
    const nuevaFecha = new Date(anio, nuevoMes, 1);
    setFechaNavegacion(nuevaFecha);
    setFechaSeleccionada(null);
    setIdEventoSeleccionado(null);
  };

  const cambiarAnioDropdown = (nuevoAnio: number) => {
    // Al cambiar año, mantenemos el mes, reseteamos al día 1
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
      if (idEventoSeleccionado === id) {
          setIdEventoSeleccionado(null);
      } else {
          setIdEventoSeleccionado(id);
          setNombre('');
          setTelefono('');
          setEmail('');
      }
  };

  const manejarEnvioReserva = (e: React.FormEvent, nombreEvento: string) => {
    e.preventDefault();
    alert(`¡Reserva Enviada!\nEvento: ${nombreEvento}\nCliente: ${nombre}`);
    setIdEventoSeleccionado(null);
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
        {/* --- HEADER NUEVO: LOGO Y SELECTORES --- */}
        <header className="cal-header">
            <div className="cal-branding">
                <Link to="/">
                    <img src={logoWakeUp} alt="Wake Up Logo" className="cal-logo" />
                </Link>
                <div className="cal-title-wrapper">
                    <h1 className="cal-title">CALENDARIO</h1>
                    <span className="cal-subtitle">DE EVENTOS</span>
                </div>
            </div>

            {/* Controles desplegables */}
            <div className="cal-controls">
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
            <svg viewBox="0 0 24 24" fill="currentColor" width="80px" height="80px" color="#FFD700">
              <path d="M15.5,5.5c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S14.4,5.5,15.5,5.5z M10.8,5L10.2,7.5L12.6,5.1L13.4,5.9c1.3,1.3,3,2.1,5.1,2.1V9c-1.5,0-2.9-0.6-4-1.5l-2.5,2.5c-1,1-2.5,1.5-3.8,1.5H7.1L5.5,17h-2l2-6.5c0.3-1,0.8-2,1.9-2.7L10.8,5z" />
              <path className="wheel-spinning" style={{transformOrigin: '5px 17px'}} d="M5,12c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S7.8,12,5,12z M5,20.5c-1.9,0-3.5-1.6-3.5-3.5s1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5S6.9,20.5,5,20.5z" />
              <path className="wheel-spinning" style={{transformOrigin: '19px 17px'}} d="M19,12c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S21.8,12,19,12z M19,20.5c-1.9,0-3.5-1.6-3.5-3.5s1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5S20.9,20.5,19,20.5z" />
            </svg>
            <p className="loader-texto no-select">Pedaleando hacia las rutas...</p>
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
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px" color="#FFD700">
                          <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.9-.6-4-1.5l-2.5 2.5c-1 1-2.5 1.5-3.8 1.5H7.1L5.5 17h-2l2-6.5c.3-1 .8-2 1.9-2.7L10.8 5l-.6 2.5zm7.7 4.5c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- SECCIÓN DE DETALLES Y RESERVA --- */}
        {fechaSeleccionada && (
          <div className="reserva-panel">
            <h3 className="panel-titulo no-select">
                RUTAS DEL <span className="fecha-destacada">{fechaSeleccionada}</span>
            </h3>
            
            {(() => {
                const eventosDia = obtenerEventosDelDia(parseInt(fechaSeleccionada.split('-')[2]));
                
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
                                                    <a href={`https://www.google.com/maps?q=${e.lat},${e.lng}`} target="_blank" rel="noopener noreferrer" className="ver-mapa-link">
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
                                            <h4 className="formulario-titulo no-select">Tus Datos</h4>
                                            
                                            <form className="reserva-form" onSubmit={(evt) => manejarEnvioReserva(evt, e.nombre_evento)}>
                                                <div className="form-grupo">
                                                    <input 
                                                        type="text" 
                                                        value={nombre} 
                                                        onChange={(ev) => setNombre(ev.target.value)} 
                                                        required 
                                                        placeholder="Nombre Completo" 
                                                    />
                                                </div>
                                                <div className="form-grupo">
                                                    <input 
                                                        type="tel" 
                                                        value={telefono} 
                                                        onChange={(ev) => setTelefono(ev.target.value)} 
                                                        required 
                                                        placeholder="Teléfono" 
                                                    />
                                                </div>
                                                <div className="form-grupo">
                                                    <input 
                                                        type="email" 
                                                        value={email} 
                                                        onChange={(ev) => setEmail(ev.target.value)} 
                                                        required 
                                                        placeholder="Email" 
                                                    />
                                                </div>
                                                <button type="submit" className="btn-confirmar">
                                                    CONFIRMAR ASISTENCIA
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