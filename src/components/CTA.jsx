import React from 'react';
import './CTA.css';

const CTA = () => {
  return (
    <section className="cta">
      <div className="cta-content">
        <h2>Pronto para começar sua jornada?</h2>
        <p>Junte-se a milhares de profissionais e empresas</p>
        <button id="cta-cadastrar" className="btn-primary btn-large">
          <i className="fas fa-rocket"></i> Começar Agora
        </button>
      </div>
    </section>
  );
};

export default CTA;