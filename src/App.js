import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import FacaLogin from './pages/FacaLogin';
import CriarConta from './pages/CriarConta';
import AriaTrabalho from './pages/AriaTrabalho';
import Perfil from './pages/Perfil';
import Usuario from './pages/usuario';  // <-- IMPORTAR O USUARIO
import PostarProjeto from './pages/postar-projeto';
import Mensagens from './pages/mensagens';
import '@fortawesome/fontawesome-free/css/all.min.css';
import Notificacoes from './pages/notificacoes';
import Pedidos from './pages/fazer-pedidos'
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="fazer-pedidos" element={<Pedidos />}/>
          <Route path='notificacoes' element={<Notificacoes/>}/>
          <Route path="/mensagens" element={<Mensagens/>}/>
          <Route path="/faca-login" element={<FacaLogin />} />
          <Route path="/criar-conta" element={<CriarConta />} />
          <Route path="/aria-trabalho" element={<AriaTrabalho />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/perfil/usuario" element={<Usuario />} />  {/* <-- ROTA PARA OUTRO USUÁRIO */}
          <Route path="/perfil/perfil1" element={<Perfil />} />
          <Route path="/postar-projeto" element={<PostarProjeto />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;