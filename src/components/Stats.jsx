import React from 'react';
import './Stats.css';

const Stats = () => {
  const stats = [
    { number: '+10.000', label: 'Freelancers' },
    { number: '+5.000', label: 'Projetos' },
    { number: '+500', label: 'Empresas' },
    { number: '+100', label: 'Categorias' }
  ];

  return (
    <section className="stats">
      {stats.map((stat, index) => (
        <div className="stat-card" key={index}>
          <div className="stat-number">{stat.number}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </section>
  );
};

export default Stats;