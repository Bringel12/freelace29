import React from 'react';
import './Features.css';

const Features = () => {
  const features = [
    { 
      icon: '📝', 
      title: 'Crie sua conta', 
      description: 'Cadastre-se gratuitamente e complete seu perfil profissional' 
    },
    { 
      icon: '🔍', 
      title: 'Encontre projetos', 
      description: 'Explore oportunidades que combinam com suas habilidades' 
    },
    { 
      icon: '🤝', 
      title: 'Comece a trabalhar', 
      description: 'Negocie, execute e receba por projetos incríveis' 
    }
  ];

  return (
    <section className="features" id="como-funciona">
      <h2 className="section-title">Como <span>Funciona</span></h2>
      <div className="features-grid">
        {features.map((feature, index) => (
          <div className="feature-item" key={index}>
            <div className="feature-icon">
              <span className="feature-emoji">{feature.icon}</span>
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;