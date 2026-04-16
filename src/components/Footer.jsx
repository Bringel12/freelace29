import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Adicionar Font Awesome apenas uma vez
  useEffect(() => {
    // Verifica se o link já existe para não duplicar
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Seção 1 - Logo e Descrição */}
        <div className="footer-section">
          <div className="footer-logo">Freelance<span>Hub</span></div>
          <p className="footer-description">
            Engenharia de Software • Soluções Corporativas
          </p>
          <p className="footer-location">
            <i className="fas fa-map-marker-alt"></i> Blumenau • Santa Catarina
          </p>
        </div>
        
        {/* Seção 2 - Links Rápidos */}
        <div className="footer-section">
          <h4>Links Rápidos</h4>
          <nav className="footer-nav">
            <Link to="/">Home</Link>
            <Link to="/faca-login">Login</Link>
            <Link to="/criar-conta">Criar Conta</Link>
            <Link to="/aria-trabalho">Área de Trabalho</Link>
          </nav>
        </div>
        
        {/* Seção 3 - Legal */}
        <div className="footer-section">
          <h4>Legal</h4>
          <nav className="footer-nav">
            <Link to="/privacidade">Política de Privacidade</Link>
            <Link to="/termos">Termos de Uso</Link>
          </nav>
          <p className="footer-copyright">
            &copy; {currentYear} Reis Systems. Todos os direitos reservados.
          </p>
        </div>
        
        {/* Seção 4 - Redes Sociais */}
        <div className="footer-section">
          <h4>Redes Sociais</h4>
          <div className="social-links">
            <a 
              href="https://linkedin.com/company/reis-systems" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="LinkedIn"
              className="social-link"
            >
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a 
              href="https://github.com/reis-systems" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="GitHub"
              className="social-link"
            >
              <i className="fab fa-github"></i>
            </a>
            <a 
              href="https://instagram.com/reis.systems" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Instagram"
              className="social-link"
            >
              <i className="fab fa-instagram"></i>
            </a>
            <a 
              href="https://twitter.com/reis_systems" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Twitter"
              className="social-link"
            >
              <i className="fab fa-twitter"></i>
            </a>
            <a 
              href="https://facebook.com/reis.systems" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Facebook"
              className="social-link"
            >
              <i className="fab fa-facebook-f"></i>
            </a>
          </div>
        </div>
      </div>
      
      {/* Linha de copyright para mobile */}
      <div className="footer-bottom-mobile">
        <p>&copy; {currentYear} Reis Systems. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;