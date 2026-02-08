import { Phone, Mail, MapPin, Instagram, Facebook, Youtube } from 'lucide-react';
import logoWakeUp from '../assets/wakeup-logo.png';
import '../styles/footer.css';

export const Footer = () => {
  return (
    <footer className="main-footer">
      <div className="footer-container">
        
        {/* BRANDING */}
        <div className="footer-section brand">
          <img src={logoWakeUp} alt="Wake Up" className="footer-logo" />
          <p>La comunidad más grande de ciclistas. Registra tus eventos, compite y pedalea con nosotros.</p>
        </div>

        {/* CONTACTO */}
        <div className="footer-section contact">
          <h4 className="footer-title">Contactanos</h4>
          <ul className="footer-contact-list">
            <li>
              <a href="tel:3515387088"><Phone size={14} className="contact-icon" /> 3515387088</a>
            </li>
            <li>
              <a href="mailto:wakeupbikes@gmail.com"><Mail size={14} className="contact-icon" /> wakeupbikes@gmail.com</a>
            </li>
            <li className="address">
              <MapPin size={14} className="contact-icon" /> 
              <span>Independencia 847 Nueva Córdoba – Córdoba capital – CP 5000</span>
            </li>
          </ul>
        </div>

        {/* REDES SOCIALES */}
        <div className="footer-section socials">
          <h4 className="footer-title">Redes Sociales</h4>
          <div className="social-container">
            <a href="https://instagram.com/wakeupbikes" target="_blank" rel="noreferrer" className="social-circle"><Instagram size={16} /></a>
            <a href="https://www.facebook.com/wakeupbikes" target="_blank" rel="noreferrer" className="social-circle"><Facebook size={16} /></a>
            <a href="https://www.youtube.com/@wakeupb9345" target="_blank" rel="noreferrer" className="social-circle"><Youtube size={16} /></a>
            <a href="https://www.tiktok.com/@wakeupbikes" target="_blank" rel="noreferrer" className="social-circle">
               <span style={{fontWeight: 'bold', fontSize: '10px'}}>Tk</span>
            </a>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} WAKE UP BIKES. Hecho por estudiantes de la Escuela Superior de Comercio Manuel Belgrano¡.</p>
      </div>
    </footer>
  );
};