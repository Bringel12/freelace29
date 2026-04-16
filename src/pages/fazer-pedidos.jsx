import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/BuscarAmigos.css';

const BuscarAmigos = () => {
  const navigate = useNavigate();

  const SUPABASE_CONFIG = {
    URL: 'https://tgnwbxcygmjipupufoix.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbndieGN5Z21qaXB1cHVmb2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDI4NDcsImV4cCI6MjA4NzE3ODg0N30.78BjN7G0a0lnUwXmveggL0GQD-Xp-5C7QYUBmfOIt_s'
  };

  const DEFAULT_AVATAR = '/img/711769.png';

  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [usuarioAvatar, setUsuarioAvatar] = useState(DEFAULT_AVATAR);
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [modoVisualizacao, setModoVisualizacao] = useState('grid');
  const [filtroAtual, setFiltroAtual] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);

  const getAuthHeaders = () => {
    const headers = { apikey: SUPABASE_CONFIG.ANON_KEY };
    let token = null;
    try {
      const storedUser = localStorage.getItem('usuarioLogado');
      if (storedUser) token = JSON.parse(storedUser).access_token;
    } catch (e) {}
    headers['Authorization'] = `Bearer ${token || SUPABASE_CONFIG.ANON_KEY}`;
    return headers;
  };

  const gerarAvatarIniciais = (nome) => {
    if (!nome) return DEFAULT_AVATAR;
    const iniciais = nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const cores = ['#0a66c2', '#28a745', '#dc3545', '#fd7e14', '#6f42c1', '#e83e8c'];
    const cor = cores[nome.length % cores.length];
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="${cor}"/>
        <text x="50" y="50" font-size="40" text-anchor="middle" dy=".3em" fill="white">${iniciais}</text>
      </svg>
    `)}`;
  };

  const aplicarFiltros = (usuarios, busca, filtro) => {
    let resultados = [...usuarios];
    if (busca) {
      const termo = busca.toLowerCase();
      resultados = resultados.filter(user => 
        user.nome?.toLowerCase().includes(termo) ||
        user.email?.toLowerCase().includes(termo)
      );
    }
    if (filtro === 'nome') {
      resultados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    } else if (filtro === 'recentes') {
      resultados.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
    setUsuariosFiltrados(resultados);
  };

  // Buscar dados
  useEffect(() => {
    const fetchData = async () => {
      // Pegar usuário logado
      const stored = localStorage.getItem('usuarioLogado');
      if (!stored) {
        navigate('/faca-login');
        return;
      }
      const user = JSON.parse(stored);
      setUsuarioLogado(user);
      
      // Buscar avatar do usuário logado
      try {
        const avatarRes = await fetch(
          `${SUPABASE_CONFIG.URL}/rest/v1/perfil?id_usuarios=eq.${user.id}&select=avatar_url`,
          { headers: getAuthHeaders() }
        );
        if (avatarRes.ok) {
          const perfis = await avatarRes.json();
          if (perfis[0]?.avatar_url) setUsuarioAvatar(perfis[0].avatar_url);
        }
      } catch (e) {}
      
      // Buscar todos os usuários
      try {
        const usersRes = await fetch(
          `${SUPABASE_CONFIG.URL}/rest/v1/usuarios?select=*`,
          { headers: getAuthHeaders() }
        );
        const usuarios = await usersRes.json();
        const outros = usuarios.filter(u => u.id !== user.id);
        
        // Buscar status de amizade para cada usuário
        const comStatus = await Promise.all(outros.map(async (u) => {
          let status = null;
          try {
            const pedidoRes = await fetch(
              `${SUPABASE_CONFIG.URL}/rest/v1/pedidos_amizade?or=(id_remetente.eq.${user.id},id_destinatario.eq.${user.id})&or=(id_remetente.eq.${u.id},id_destinatario.eq.${u.id})`,
              { headers: getAuthHeaders() }
            );
            if (pedidoRes.ok) {
              const pedidos = await pedidoRes.json();
              if (pedidos.length) status = pedidos[0].status;
            }
          } catch (e) {}
          
          // Buscar foto
          let foto = null;
          try {
            const fotoRes = await fetch(
              `${SUPABASE_CONFIG.URL}/rest/v1/perfil?id_usuarios=eq.${u.id}&select=avatar_url`,
              { headers: getAuthHeaders() }
            );
            if (fotoRes.ok) {
              const perfis = await fotoRes.json();
              foto = perfis[0]?.avatar_url;
            }
          } catch (e) {}
          
          return { ...u, statusAmizade: status, fotoPerfil: foto };
        }));
        
        setTodosUsuarios(comStatus);
        aplicarFiltros(comStatus, termoBusca, filtroAtual);
      } catch (e) {
        console.error('Erro:', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const enviarPedidoAmizade = async (destinatarioId) => {
    if (!usuarioLogado) return;
    try {
      const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/pedidos_amizade`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.ANON_KEY,
          'Authorization': `Bearer ${usuarioLogado.access_token || SUPABASE_CONFIG.ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_remetente: usuarioLogado.id,
          id_destinatario: destinatarioId,
          status: 'pendente',
          data_pedido: new Date().toISOString()
        })
      });
      if (response.ok) {
        const novos = todosUsuarios.map(u => 
          u.id === destinatarioId ? { ...u, statusAmizade: 'pendente' } : u
        );
        setTodosUsuarios(novos);
        aplicarFiltros(novos, termoBusca, filtroAtual);
        alert('Pedido enviado!');
      } else {
        alert('Erro ao enviar pedido');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar pedido');
    }
  };

  const irParaChat = (userId) => {
    sessionStorage.setItem('chatDestinatarioId', userId);
    navigate('/mensagens');
  };

  const abrirModalPerfil = (user) => {
    setUsuarioSelecionado(user);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setUsuarioSelecionado(null);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setTermoBusca(value);
    aplicarFiltros(todosUsuarios, value, filtroAtual);
  };

  const handleClearSearch = () => {
    setTermoBusca('');
    document.getElementById('searchInput').value = '';
    aplicarFiltros(todosUsuarios, '', filtroAtual);
  };

  const hasSearchTerm = termoBusca.length > 0;
  const [showTopButton, setShowTopButton] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setShowTopButton(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const renderUserCard = (user) => {
    const avatar = user.fotoPerfil || gerarAvatarIniciais(user.nome);
    const status = user.statusAmizade;
    
    let botao;
    if (status === 'pendente') {
      botao = <button className="btn-add-friend" disabled style={{ background: '#ffc107' }}><i className="fas fa-clock"></i> Pendente</button>;
    } else if (status === 'aceito') {
      botao = <button className="btn-add-friend" disabled style={{ background: '#28a745' }}><i className="fas fa-check"></i> Amigos</button>;
    } else {
      botao = <button className="btn-add-friend" onClick={() => enviarPedidoAmizade(user.id)}><i className="fas fa-user-plus"></i> Adicionar</button>;
    }
    
    return (
      <div key={user.id} className={`user-card ${modoVisualizacao === 'list' ? 'list-view' : ''}`}>
        <img src={avatar} alt={user.nome} className="user-avatar" onError={(e) => e.target.src = gerarAvatarIniciais(user.nome)} />
        <div className="user-info">
          <div className="user-name">{user.nome || 'Sem nome'}</div>
          <div className="user-stats">
            <span className="stat"><i className="fas fa-star"></i> <span className="reputacao">{(user.reputacao || 4.5).toFixed(1)}</span></span>
            <span className="stat"><i className="fas fa-briefcase"></i> <span>{user.total_projetos || 0} projetos</span></span>
          </div>
        </div>
        <div className="user-actions">
          {botao}
          <button className="btn-view-profile" onClick={() => abrirModalPerfil(user)}><i className="fas fa-eye"></i> Ver Perfil</button>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!modalAberto || !usuarioSelecionado) return null;
    const avatar = usuarioSelecionado.fotoPerfil || gerarAvatarIniciais(usuarioSelecionado.nome);
    const status = usuarioSelecionado.statusAmizade;
    
    let botao;
    if (status === 'pendente') {
      botao = <button className="btn-add-friend" disabled style={{ background: '#ffc107' }}><i className="fas fa-clock"></i> Pendente</button>;
    } else if (status === 'aceito') {
      botao = <button className="btn-add-friend" disabled style={{ background: '#28a745' }}><i className="fas fa-check"></i> Amigos</button>;
    } else {
      botao = <button className="btn-add-friend" onClick={() => enviarPedidoAmizade(usuarioSelecionado.id)}><i className="fas fa-user-plus"></i> Adicionar amigo</button>;
    }
    
    return (
      <div className="modal-overlay" onClick={fecharModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Perfil do Usuário</h3>
            <button className="modal-close" onClick={fecharModal}><i className="fas fa-times"></i></button>
          </div>
          <div className="modal-body">
            <div className="profile-detail">
              <img src={avatar} alt={usuarioSelecionado.nome} className="profile-detail-avatar" onError={(e) => e.target.src = gerarAvatarIniciais(usuarioSelecionado.nome)} />
              <h3 className="profile-detail-name">{usuarioSelecionado.nome || 'Sem nome'}</h3>
              <p className="profile-detail-email">{usuarioSelecionado.email || 'Email não disponível'}</p>
              <div className="profile-detail-stats">
                <div className="profile-detail-stat"><span className="value">{(usuarioSelecionado.reputacao || 4.5).toFixed(1)}</span><span className="label">Reputação</span></div>
                <div className="profile-detail-stat"><span className="value">{usuarioSelecionado.total_projetos || 0}</span><span className="label">Projetos</span></div>
              </div>
              <div className="profile-detail-actions">
                {botao}
                <button className="btn-view-profile" onClick={() => irParaChat(usuarioSelecionado.id)}><i className="fas fa-envelope"></i> Enviar mensagem</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="buscar-topbar">
        <div className="topbar-container">
          <h1><a href="/aria-trabalho">Freelance<span>Hub</span></a></h1>
          <div className="topbar-user" onClick={() => navigate('/perfil')}>
            <img src={usuarioAvatar} alt="Perfil" className="topbar-avatar" />
            <span>{usuarioLogado?.nome || 'Carregando...'}</span>
          </div>
        </div>
      </header>

      <main className="buscar-main">
        <div className="buscar-container">
          <div className="buscar-header">
            <h2><i className="fas fa-user-friends"></i> Buscar Amigos</h2>
            <p>Encontre outros freelancers e profissionais</p>
          </div>

          <div className="search-section">
            <div className="search-box">
              <i className="fas fa-search search-icon"></i>
              <input id="searchInput" type="text" placeholder="Buscar por nome ou email..." onChange={handleSearchChange} autoComplete="off" />
              {hasSearchTerm && <button className="btn-clear visible" onClick={handleClearSearch}><i className="fas fa-times"></i></button>}
            </div>

            <div className="filter-section">
              <button className={`filter-btn ${filtroAtual === 'todos' ? 'active' : ''}`} onClick={() => { setFiltroAtual('todos'); aplicarFiltros(todosUsuarios, termoBusca, 'todos'); }}><i className="fas fa-users"></i> Todos</button>
              <button className={`filter-btn ${filtroAtual === 'nome' ? 'active' : ''}`} onClick={() => { setFiltroAtual('nome'); aplicarFiltros(todosUsuarios, termoBusca, 'nome'); }}><i className="fas fa-sort-alpha-down"></i> Nome</button>
              <button className={`filter-btn ${filtroAtual === 'recentes' ? 'active' : ''}`} onClick={() => { setFiltroAtual('recentes'); aplicarFiltros(todosUsuarios, termoBusca, 'recentes'); }}><i className="fas fa-clock"></i> Mais recentes</button>
              <button className={`filter-btn ${filtroAtual === 'reputacao' ? 'active' : ''}`} onClick={() => { setFiltroAtual('reputacao'); aplicarFiltros(todosUsuarios, termoBusca, 'reputacao'); }}><i className="fas fa-star"></i> Reputação</button>
            </div>
          </div>

          <div className="results-section">
            <div className="results-header">
              <span>{usuariosFiltrados.length} resultado{usuariosFiltrados.length !== 1 ? 's' : ''}</span>
              <div className="view-options">
                <button className={`view-btn ${modoVisualizacao === 'grid' ? 'active' : ''}`} onClick={() => setModoVisualizacao('grid')}><i className="fas fa-th-large"></i></button>
                <button className={`view-btn ${modoVisualizacao === 'list' ? 'active' : ''}`} onClick={() => setModoVisualizacao('list')}><i className="fas fa-list"></i></button>
              </div>
            </div>

            <div className={`users-grid ${modoVisualizacao === 'list' ? 'list-view' : ''}`}>
              {isLoading ? (
                <div className="loading-spinner"><i className="fas fa-spinner fa-spin"></i><p>Carregando usuários...</p></div>
              ) : usuariosFiltrados.length === 0 ? (
                <div className="loading-spinner"><i className="fas fa-user-slash"></i><p>Nenhum outro usuário encontrado.</p></div>
              ) : (
                usuariosFiltrados.map(renderUserCard)
              )}
            </div>
          </div>
        </div>
        <button className={`btn-topo ${showTopButton ? 'visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><i className="fas fa-arrow-up"></i></button>
      </main>

      {renderModal()}
    </>
  );
};

export default BuscarAmigos;