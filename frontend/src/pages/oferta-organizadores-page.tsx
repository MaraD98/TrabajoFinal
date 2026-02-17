import { Link } from 'react-router-dom';
import '../styles/oferta-organizadores.css';
import { Navbar } from '../components/navbar';
import { Footer } from '../components/footer';

export const OfertaOrganizadoresPage = () => {
  return (
    <div className="org-page">
        <Navbar/>
      
      {/* 1. HERO SECTION */}
      <section className="org-hero">
        <div className="org-hero-overlay">
          <h1 className="org-title">WAKE UP BIKES</h1>
          <h2 className="org-subtitle">TODOS LOS EVENTOS EN UN SOLO LUGAR.</h2>
          <p className="org-description">
            La plataforma definitiva para gestionar, promocionar y llenar el cupo de tu próxima carrera.
            Deja el Excel, pásate a WAKE UP BIKES.
          </p>
          <div className="org-actions">
            <Link to="/publicar-evento" className="btn-primary-org">
              PUBLICA TU EVENTO GRATIS
            </Link>
            <a href="#beneficios" className="btn-secondary-org">
              Saber más
            </a>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR (Prueba social) */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">+50</span>
          <span className="stat-label">Organizadores</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">+10k</span>
          <span className="stat-label">Corredores Activos</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">100%</span>
          <span className="stat-label">Pasión Ciclista</span>
        </div>
      </div>

      {/* 3. BENEFICIOS (Grid) */}
      <section id="beneficios" className="org-benefits">
        <div className="section-header">
          <h3>¿POR QUÉ WAKE UP BIKES?</h3>
          <p>Te damos las herramientas que usan los grandes eventos.</p>
        </div>

        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="icon-box">🗺️</div>
            <h4>Visibilidad Total</h4>
            <p>Tu evento aparecerá en nuestro <strong>Mapa Interactivo</strong> y calendario nacional. Miles de ciclistas buscando su próximo desafío te encontrarán al instante.</p>
          </div>

          <div className="benefit-card">
            <div className="icon-box">💳</div>
            <h4>Gestión de Inscripciones</h4>
            <p>Olvídate de las transferencias manuales y los emails perdidos. Automatiza el registro, los pagos y la generación de dorsales.</p>
          </div>

          <div className="benefit-card">
            <div className="icon-box">📊</div>
            <h4>Panel de Control</h4>
            <p>Accede a reportes en tiempo real. Mira cuántos inscriptos tienes, filtra por categorías y exporta tu lista de competidores en un clic.</p>
          </div>

          <div className="benefit-card">
            <div className="icon-box">📣</div>
            <h4>Comunidad Activa</h4>
            <p>Notificamos a los usuarios cercanos a tu evento. Hacemos que "Wake up Bikes" sea una realidad llevando gente a la línea de largada.</p>
          </div>
        </div>
      </section>

      {/* 4. CÓMO FUNCIONA (Pasos simples) */}
      <section className="org-steps">
        <div className="steps-container">
          <div className="step">
            <span className="step-number">01</span>
            <h4>Crea tu cuenta</h4>
            <p>Regístrate como organizador en menos de 2 minutos.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            <span className="step-number">02</span>
            <h4>Carga tu evento</h4>
            <p>Sube fecha, lugar, costos y circuito.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            <span className="step-number">03</span>
            <h4>Recibe inscriptos</h4>
            <p>Mira cómo crece tu lista de corredores.</p>
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA */}
      <section className="org-cta-final">
        <h2>¿LISTO PARA RODAR?</h2>
        <p>Únete a la revolución de eventos deportivos.</p>
        <Link to="/publicar-evento" className="btn-large-cta">
          EMPEZAR AHORA
        </Link>
      </section>
      <Footer/>
    </div>
  );
};