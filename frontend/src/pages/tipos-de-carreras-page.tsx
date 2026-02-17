import { Link } from 'react-router-dom';
import '../styles/tipos-carreras.css'; // Asegúrate de crear este archivo
import { Footer } from '../components/footer';
import { Navbar } from '../components/navbar';

// Definimos la data aquí (o podrías traerla de tu API)
const CATEGORIAS_EVENTOS = [
  {
    id: 'ruta',
    titulo: 'Ciclismo de Ruta',
    icono: '🚴‍♂️',
    descripcion: 'Velocidad pura sobre asfalto. Desde critériums explosivos hasta Gran Fondos de más de 100km. Ideal para estrategas y rodadores.',
    color: '#E74C3C' // Rojo intenso
  },
  {
    id: 'mtb',
    titulo: 'Mountain Bike (MTB)',
    icono: '🏔️',
    descripcion: 'Senderos, piedras y naturaleza. Incluye modalidades como Rally, XCO (circuitos) y Descenso. Pone a prueba tu técnica y resistencia.',
    color: '#27AE60' // Verde bosque
  },
  {
    id: 'rural',
    titulo: 'Rural Bike',
    icono: '🌾',
    descripcion: 'Caminos anchos de tierra y llanuras. La puerta de entrada perfecta al ciclismo competitivo. Menos técnica que el MTB, pero mucha potencia.',
    color: '#F39C12' // Naranja tierra
  },
  {
    id: 'gravel',
    titulo: 'Gravel',
    icono: '🛤️',
    descripcion: 'La aventura híbrida. Bicis veloces en caminos de ripio y grava. Mezcla la velocidad de la ruta con la libertad de la montaña.',
    color: '#8E44AD' // Morado
  },
  {
    id: 'cicloturismo',
    titulo: 'Cicloturismo',
    icono: '📷',
    descripcion: 'Sin cronómetros, solo disfrute. Recorridos guiados para conocer paisajes, gastronomía y hacer amigos sobre ruedas.',
    color: '#2980B9' // Azul tranquilo
  },
  {
    id: 'entrenamiento',
    titulo: 'Entrenamiento / Social',
    icono: '⏱️',
    descripcion: 'Salidas grupales para mejorar forma física o rodadas técnicas para aprender habilidades específicas antes de competir.',
    color: '#34495E' // Gris oscuro
  }
];

export const TiposCarrerasPage = () => {
  return (
    <div className="tipos-page">
      <Navbar/>
      {/* Hero Section simple */}
      <div className="tipos-header">
        <h1>TIPOS DE CARRERAS</h1>
        <p>Descubre qué modalidad se adapta mejor a tu próximo desafío.</p>
      </div>

      <div className="tipos-grid-container">
        {CATEGORIAS_EVENTOS.map((cat) => (
          <div key={cat.id} className="tipo-card" style={{ borderTopColor: cat.color }}>
            <div className="card-icon" style={{ backgroundColor: `${cat.color}20` }}>
                {/* El 20 al final agrega transparencia hex si usas colores hex */}
                {cat.icono}
            </div>
            <h3>{cat.titulo}</h3>
            <p>{cat.descripcion}</p>
            <Link to={`/calendario?tipo=${cat.id}`} className="card-link">
              Ver Eventos de {cat.titulo.split(' ')[0]} →
            </Link>
          </div>
        ))}
      </div>

      {/* Call to Action final */}
      <div className="tipos-cta">
        <h2>¿Eres Organizador?</h2>
        <p>No importa la modalidad, en Wake Up Bikes tenemos el lugar para tu evento.</p>
        <Link to="/publicar-evento" className="cta-button">CREAR MI EVENTO AHORA</Link>
      </div>
      <Footer/>
    </div>
  );
};