import { useState, useEffect } from 'react';
import { getEventosCalendario } from '../services/eventos'; 
import '../styles/Calendario.css';

// 1. INTERFACE ACTUALIZADA CON TODOS LOS DATOS DEL BACKEND
interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion?: string;
  
  // Datos nuevos
  descripcion?: string;
  costo_participacion?: number;
  lat?: number;
  lng?: number;

  // Relaciones (ID y Nombre)
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
  }, [mes, anio]);

  const cargarEventos = async () => {
    setCargando(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
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

  const cambiarMes = (direccion: number) => {
    const nuevaFecha = new Date(anio, mes + direccion, 1);
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
    // Convertimos a minúsculas para comparar mejor por si acaso
    const dif = dificultad?.toLowerCase() || '';
    if (dif.includes('experto') || dif.includes('avanzado')) return 'dificultad-experto';
    if (dif.includes('intermedio')) return 'dificultad-intermedio';
    if (dif.includes('principiante') || dif.includes('básico')) return 'dificultad-principiante';
    return 'dificultad-general';
  };

  return (
    <div className="calendario-container">
      <div className="calendario-wrapper">
        <header className="calendario-header">
          <h1 className="calendario-titulo no-select">Calendario de Eventos</h1>
          <div className="calendario-navegacion">
            <button className="btn-navegacion" onClick={() => cambiarMes(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h2 className="mes-actual no-select">{MESES[mes]} {anio}</h2>
            <button className="btn-navegacion" onClick={() => cambiarMes(1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </header>

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
                    style={{ 
                        userSelect: 'none', 
                        cursor: esPasado ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    <div className="dia-numero">{dia}</div>
                    
                    {tieneEventos && (
                      <div className="icono-evento-bici">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px" color="#FFD700">
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
            <h3 className="no-select">Eventos del {fechaSeleccionada}</h3>
            
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
                                        <div className="evento-titulo">
                                            {e.nombre_evento}
                                        </div>

                                        <div className="evento-badges">
                                            <span className="badge-item">
                                                ⚡ <span className={`texto-dificultad ${claseDificultad}`}>
                                                    {e.nombre_dificultad || 'General'}
                                                </span>
                                            </span>
                                            <span className="badge-item">
                                                🚴 {e.nombre_tipo || 'Ruta'}
                                            </span>
                                        </div>

                                        {/* 2. MOSTRAR DESCRIPCIÓN */}
                                        {e.descripcion && (
                                            <div style={{ margin: '10px 0', fontStyle: 'italic', fontSize: '0.9rem', color: '#555' }}>
                                                "{e.descripcion}"
                                            </div>
                                        )}

                                        <div className="evento-info-extra">
                                           {/* 3. MOSTRAR COSTO */}
                                           <span className="info-item">
                                                💰 {e.costo_participacion && e.costo_participacion > 0 
                                                    ? <span>${e.costo_participacion}</span> 
                                                    : <span style={{color: 'green', fontWeight: 'bold'}}>Gratis</span>}
                                           </span>

                                           <span className="info-item">
                                                👥 
                                                {e.cupo_maximo && e.cupo_maximo > 0 ? (
                                                    <span><strong>Cupo:</strong> {e.cupo_maximo}</span>
                                                ) : (
                                                    <span className="cupo-ilimitado">Ilimitado</span>
                                                )}
                                           </span>
                                        </div>
                                        
                                        {e.ubicacion && (
                                            <div className="evento-ubicacion" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                                <span>📍 {e.ubicacion}</span>
                                                
                                                {/* 4. BOTÓN VER MAPA (Si hay lat/lng) */}
                                                {e.lat && e.lng && (
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="ver-mapa-link"
                                                        style={{ 
                                                            fontSize: '0.8rem', 
                                                            color: '#2563eb', 
                                                            textDecoration: 'underline',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Ver en mapa 🗺️
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="evento-acciones">
                                        <button 
                                            onClick={() => toggleReserva(e.id_evento)}
                                            className={`btn-accion ${estaAbierto ? 'cancelar' : ''}`}
                                        >
                                            {estaAbierto ? 'Cancelar Inscripción' : 'Inscribirme a este evento'}
                                        </button>
                                    </div>

                                    {estaAbierto && (
                                        <div className="formulario-container">
                                            <h4 className="formulario-titulo no-select">Completa tus datos:</h4>
                                            
                                            <form className="reserva-form" onSubmit={(evt) => manejarEnvioReserva(evt, e.nombre_evento)}>
                                                <div className="form-grupo">
                                                    <label className="no-select">Nombre Completo:</label>
                                                    <input 
                                                        type="text" 
                                                        value={nombre} 
                                                        onChange={(ev) => setNombre(ev.target.value)} 
                                                        required 
                                                        placeholder="Tu nombre" 
                                                    />
                                                </div>
                                                <div className="form-grupo">
                                                    <label className="no-select">Teléfono:</label>
                                                    <input 
                                                        type="tel" 
                                                        value={telefono} 
                                                        onChange={(ev) => setTelefono(ev.target.value)} 
                                                        required 
                                                        placeholder="Para contactarte" 
                                                    />
                                                </div>
                                                <div className="form-grupo">
                                                    <label className="no-select">Email:</label>
                                                    <input 
                                                        type="email" 
                                                        value={email} 
                                                        onChange={(ev) => setEmail(ev.target.value)} 
                                                        required 
                                                        placeholder="ejemplo@correo.com" 
                                                    />
                                                </div>
                                                <button type="submit" className="btn-confirmar">
                                                    Confirmar Reserva
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
                    return <p className="mensaje-vacio no-select">No hay rutas programadas para este día.</p>
                }
            })()}
          </div>
        )}
      </div>
    </div>
  );
}