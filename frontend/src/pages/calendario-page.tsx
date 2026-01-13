import { useState, useEffect } from 'react';
import { getEventos } from '../services/eventos'; 

import '../styles/Calendario.css';

interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion?: string;
  nombre_tipo?: string;
  id_tipo?: number; 
  id_dificultad?: number;
  cupo_maximo?: number; 
  costo_participacion?: string | number;
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
      // Cambiado: ahora usa getEventos() directamente sin parámetros
      const data = await getEventos();
      console.log("Eventos cargados:", data);
      
      // Filtramos los eventos del mes y año actual de navegación
      const eventosFiltrados = (data || []).filter((evento: Evento) => {
        if (!evento.fecha_evento) return false;
        const fechaEvento = new Date(evento.fecha_evento);
        return fechaEvento.getMonth() === mes && fechaEvento.getFullYear() === anio;
      });
      
      setEventos(eventosFiltrados);
    } catch (error) {
      console.error('Error al cargar eventos:', error);
      setEventos([]);
    } finally {
      setCargando(false);
    }
  };

  // Convierte ID o Nombre a Color y Texto de Dificultad
  const getDificultadInfo = (e: Evento) => {
    let nivel = 'General';
    
    if (e.id_dificultad === 3) nivel = 'Experto';
    else if (e.id_dificultad === 2) nivel = 'Intermedio';
    else if (e.id_dificultad === 1) nivel = 'Principiante';

    const color = 
        nivel === 'Experto' ? '#e74c3c' :
        nivel === 'Intermedio' ? '#f39c12' :
        '#27ae60';

    return { texto: nivel, color };
  };

  // Convierte ID o Nombre a Texto de Tipo
  const getTipoLabel = (e: Evento) => {
    if (e.nombre_tipo) return e.nombre_tipo;
    if (e.id_tipo === 1) return 'Running';
    if (e.id_tipo === 2) return 'Ciclismo';
    if (e.id_tipo === 3) return 'Triatlón';
    return 'Evento';
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
  const noSelectStyle: React.CSSProperties = { userSelect: 'none', cursor: 'default' };

  return (
    <div className="calendario-container">
      <div className="calendario-wrapper">
        <header className="calendario-header">
          <h1 className="calendario-titulo" style={noSelectStyle}>Calendario de Eventos</h1>
          <div className="calendario-navegacion">
            <button className="btn-navegacion" onClick={() => cambiarMes(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h2 className="mes-actual" style={noSelectStyle}>{MESES[mes]} {anio}</h2>
            <button className="btn-navegacion" onClick={() => cambiarMes(1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </header>

        {cargando ? (
          <div className="calendario-cargando" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
            <style>
              {`
                @keyframes spin-wheel {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                .wheel-spinning {
                  animation: spin-wheel 0.8s linear infinite;
                }
              `}
            </style>
            <svg viewBox="0 0 24 24" fill="currentColor" width="80px" height="80px" color="#FFD700">
              <path d="M15.5,5.5c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S14.4,5.5,15.5,5.5z M10.8,5L10.2,7.5L12.6,5.1L13.4,5.9c1.3,1.3,3,2.1,5.1,2.1V9c-1.5,0-2.9-0.6-4-1.5l-2.5,2.5c-1,1-2.5,1.5-3.8,1.5H7.1L5.5,17h-2l2-6.5c0.3-1,0.8-2,1.9-2.7L10.8,5z" />
              <path className="wheel-spinning" style={{transformOrigin: '5px 17px'}} d="M5,12c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S7.8,12,5,12z M5,20.5c-1.9,0-3.5-1.6-3.5-3.5s1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5S6.9,20.5,5,20.5z" />
              <path className="wheel-spinning" style={{transformOrigin: '19px 17px'}} d="M19,12c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S21.8,12,19,12z M19,20.5c-1.9,0-3.5-1.6-3.5-3.5s1.6-3.5,3.5-3.5s3.5,1.6,3.5,3.5S20.9,20.5,19,20.5z" />
            </svg>
            <p style={{ marginTop: '20px', color: '#555', fontSize: '1.2rem', fontWeight: '500', ...noSelectStyle }}>
              Pedaleando hacia las rutas...
            </p>
          </div>
        ) : (
          <div className="calendario-grid-wrapper">
            <div className="calendario-grid">
              {DIAS_SEMANA.map(dia => <div key={dia} className="dia-semana-header" style={noSelectStyle}>{dia}</div>)}

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

        {fechaSeleccionada && (
          <div className="reserva-panel">
            <h3 style={noSelectStyle}>Eventos del {fechaSeleccionada}</h3>
            
            {(() => {
                const eventosDia = obtenerEventosDelDia(parseInt(fechaSeleccionada.split('-')[2]));
                
                if(eventosDia.length > 0) {
                    return (
                        <div className="lista-eventos-disponibles" style={{marginBottom: '20px'}}>
                            {eventosDia.map((e) => {
                                const estaAbierto = idEventoSeleccionado === e.id_evento;
                                const dificultad = getDificultadInfo(e);
                                const tipoLabel = getTipoLabel(e);

                                return (
                                <div key={e.id_evento} style={{
                                    background: 'white',
                                    border: estaAbierto ? '2px solid #f1c40f' : '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    padding: '15px',
                                    marginBottom: '15px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    textAlign: 'left',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{...noSelectStyle}}>
                                        <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#2c3e50'}}>
                                            {e.nombre_evento}
                                        </div>

                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '15px', color: '#555', fontSize: '0.9rem', marginTop:'8px'}}>
                                            <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                ⚡ <span style={{
                                                   fontWeight: 'bold',
                                                   color: dificultad.color
                                                }}>
                                                     {dificultad.texto}
                                                </span>
                                            </span>
                                            <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                🚴 {tipoLabel}
                                            </span>
                                        </div>

                                        <div style={{
                                            marginTop: '8px', 
                                            paddingTop: '8px', 
                                            borderTop: '1px dashed #eee',
                                            fontSize: '0.95rem',
                                            color: '#333'
                                        }}>
                                           <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                                                {Number(e.costo_participacion) > 0 
                                                 ? <span style={{ color: '#2c3e50' }}>💰 ${Number(e.costo_participacion)}</span> 
                                                 : <span style={{ color: 'green' }}>💰 Gratis</span>
                                                }
                                           </div>

                                           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                👥 
                                                {Number(e.cupo_maximo) > 0 ? (
                                                    <span><strong>Cupo Total:</strong> {e.cupo_maximo}</span>
                                                ) : (
                                                    <span style={{color: 'green'}}>Cupos Ilimitados</span>
                                                )}
                                           </div>
                                        </div>
                                        
                                        {e.ubicacion && (
                                            <div style={{color: '#7f8c8d', fontSize: '0.9rem', marginTop:'5px'}}>
                                                📍 {e.ubicacion}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{marginTop: '15px', display: 'flex', justifyContent: 'flex-end'}}>
                                        <button 
                                            onClick={() => toggleReserva(e.id_evento)}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: estaAbierto ? '#e74c3c' : '#2c3e50',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {estaAbierto ? 'Cancelar Inscripción' : 'Inscribirme a este evento'}
                                        </button>
                                    </div>

                                    {estaAbierto && (
                                        <div style={{
                                            marginTop: '15px', 
                                            padding: '15px', 
                                            backgroundColor: '#f9f9f9', 
                                            borderRadius: '6px',
                                            border: '1px solid #ddd',
                                            animation: 'fadeIn 0.3s ease-in-out'
                                        }}>
                                            <h4 style={{marginTop: 0, color: '#333', ...noSelectStyle}}>Completa tus datos:</h4>
                                            
                                            <form className="reserva-form" onSubmit={(evt) => manejarEnvioReserva(evt, e.nombre_evento)}>
                                                <div className="form-grupo">
                                                    <label style={noSelectStyle}>Nombre Completo:</label>
                                                    <input 
                                                        type="text" 
                                                        value={nombre} 
                                                        onChange={(ev) => setNombre(ev.target.value)} 
                                                        required 
                                                        placeholder="Tu nombre" 
                                                    />
                                                </div>
                                                <div className="form-grupo">
                                                    <label style={noSelectStyle}>Teléfono:</label>
                                                    <input 
                                                        type="tel" 
                                                        value={telefono} 
                                                        onChange={(ev) => setTelefono(ev.target.value)} 
                                                        required 
                                                        placeholder="Para contactarte" 
                                                    />
                                                </div>
                                                <div className="form-grupo">
                                                    <label style={noSelectStyle}>Email:</label>
                                                    <input 
                                                        type="email" 
                                                        value={email} 
                                                        onChange={(ev) => setEmail(ev.target.value)} 
                                                        required 
                                                        placeholder="ejemplo@correo.com" 
                                                    />
                                                </div>
                                                <button type="submit" className="btn-confirmar" style={{width: '100%'}}>
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
                    return <p style={{color: '#666', fontStyle: 'italic', ...noSelectStyle}}>No hay rutas programadas para este día.</p>
                }
            })()}
          </div>
        )}
      </div>
    </div>
  );
}