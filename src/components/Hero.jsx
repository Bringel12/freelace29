import React from 'react';
import './Hero.css';
import { useNavigate } from "react-router-dom";

const Hero = () => {

  const navigate = useNavigate(); // 👈 adiciona aqui

  return (
    <section className="hero">
      {/* Imagem de fundo */}
      <div 
        className="hero-background"
        style={{
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      ></div>

      {/* Conteúdo do Hero */}
      <div className="hero-content" style={{ position: 'relative', zIndex: 2 }}>
        <h1>O Futuro do <span>Trabalho Digital</span> Começa Aqui!</h1>
        <p className="hero-description">
          Conectando <strong>Talentos da Tecnologia</strong> a Projetos Reais.<br />
          Inovação e Oportunidades Ilimitadas.
        </p>

        <div className="buttons">
          <button id="explorar" className="btn-primary">
            <i className="fas fa-search"></i> Explorar Projetos
          </button>

          <button
            id="cadastrar"
            className="btn-secondary"
            onClick={() => navigate("/criar-conta")} // 👈 só isso
          >
            <i className="fas fa-user-plus"></i> Cadastrar Freelancer
          </button>
        </div>

        <div className="infos">
          <span><i className="fas fa-shield-alt"></i> 100% Seguro</span>
          <span><i className="fas fa-credit-card"></i> Pagamentos Garantidos</span>
          <span><i className="fas fa-headset"></i> Suporte 24/7</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;