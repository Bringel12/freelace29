import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="logo">Freelance<span>Hub</span></div>
      <nav className="nav-menu">
        <a href="#como-funciona">Como Funciona</a>
        <a href="#projetos">Projetos</a>
        <a href="#contato">Contato</a>
        <a href="/faca-login" className="nav-login">Login</a>
        {/* <a href="#como-funciona">Como Funciona</a> */}
        {/* <a href="#projetos">Projetos</a> */}
        {/* <a href="#contato">Contato</a> */}
      </nav>
    </header>
  );
};

export default Header;