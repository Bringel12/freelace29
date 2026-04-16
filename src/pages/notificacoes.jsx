import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Notificacoes.css';

const Notificacoes = () => {
  const navigate = useNavigate();

  // ===== CONFIGURAÇÃO SUPABASE =====
  const SUPABASE_CONFIG = {
    URL: 'https://tgnwbxcygmjipupufoix.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbndieGN5Z21qaXB1cHVmb2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDI4NDcsImV4cCI6MjA4NzE3ODg0N30.78BjN7G0a0lnUwXmveggL0GQD-Xp-5C7QYUBmfOIt_s'
  };

  // ===== CONSTANTES =====
  const DEFAULT_AVATAR = '/img/711769.png';

  // ===== ESTADOS =====
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [notificacoes, setNotificacoes] = useState([]);
  const [filtroAtual, setFiltroAtual] = useState('todas');
  const [isLoading, setIsLoading] = useState(true);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [error, setError] = useState(null);

  // ===== REFS =====
  const pollingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);

  // ===== UTILS =====
  const getAuthHeaders = useCallback((includeContentType = true) => {
    const headers = { apikey: SUPABASE_CONFIG.ANON_KEY };
    if (includeContentType) headers['Content-Type'] = 'application/json';
    let token = usuarioLogado?.access_token;
    if (!token) {
      try {
        const storedUser = localStorage.getItem('usuarioLogado');
        if (storedUser) token = JSON.parse(storedUser).access_token;
      } catch (e) {
        console.error('Erro ao ler localStorage:', e);
      }
    }
    headers['Authorization'] = `Bearer ${token || SUPABASE_CONFIG.ANON_KEY}`;
    return headers;
  }, [usuarioLogado]);

  const formatarTempo = (data) => {
    if (!data) return 'agora mesmo';
    const agora = new Date();
    const diffMs = agora - new Date(data);
    const diffMin = Math.floor(diffMs / 60000);
    const diffHora = Math.floor(diffMin / 60);
    const diffDia = Math.floor(diffHora / 24);

    if (diffMin < 1) return 'agora mesmo';
    if (diffMin === 1) return 'há 1 minuto';
    if (diffMin < 60) return `há ${diffMin} minutos`;
    if (diffHora === 1) return 'há 1 hora';
    if (diffHora < 60) return `há ${diffHora} horas`;
    if (diffDia === 1) return 'há 1 dia';
    return `há ${diffDia} dias`;
  };

  const getIcone = (tipo) => {
    const icones = {
      'curtida': 'fas fa-heart',
      'comentario': 'fas fa-comment',
      'pedido_amizade': 'fas fa-user-plus',
      'pedido_aceito': 'fas fa-check-circle',
      'amizade_confirmada': 'fas fa-user-friends',
      'projeto': 'fas fa-briefcase'
    };
    return icones[tipo] || 'fas fa-bell';
  };

  const getIconeClasse = (tipo) => {
    const classes = {
      'curtida': 'curtida',
      'comentario': 'comentario',
      'pedido_amizade': 'pedido',
      'pedido_aceito': 'sucesso',
      'amizade_confirmada': 'sucesso',
      'projeto': 'projeto'
    };
    return classes[tipo] || '';
  };

  // ===== FUNÇÕES DE NOTIFICAÇÃO =====
  const criarNotificacao = async (idUsuario, tipo, idOrigem, mensagem) => {
    if (!usuarioLogado) return;
    
    try {
      const notificacao = {
        id_usuario: idUsuario,
        tipo: tipo,
        id_origem: idOrigem,
        mensagem: mensagem,
        lida: false,
        data_criacao: new Date().toISOString()
      };

      await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/notificacoes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(notificacao)
      });
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  const marcarComoLida = async (notificacaoId) => {
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/notificacoes?id=eq.${notificacaoId}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ lida: true })
        }
      );

      if (response.ok) {
        setNotificacoes(prev => prev.map(n => 
          n.id === notificacaoId ? { ...n, lida: true } : n
        ));
        setTotalNaoLidas(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      const naoLidas = notificacoes.filter(n => !n.lida);
      
      for (let notif of naoLidas) {
        await fetch(
          `${SUPABASE_CONFIG.URL}/rest/v1/notificacoes?id=eq.${notif.id}`,
          {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ lida: true })
          }
        );
      }
      
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      setTotalNaoLidas(0);
      alert('Todas as notificações foram marcadas como lidas!');
      
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      alert('Erro ao marcar notificações. Tente novamente.');
    }
  };

  // ===== BUSCAR DADOS =====
  const buscarDadosUsuario = useCallback(async (userId) => {
    if (!userId || !usuarioLogado) return null;
    
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/usuarios?id=eq.${userId}&select=nome,email`,
        { headers: getAuthHeaders() }
      );
      
      if (response.ok) {
        const users = await response.json();
        return users[0] || null;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return null;
    }
  }, [usuarioLogado, getAuthHeaders]);

  const verificarAmizade = useCallback(async (remetenteId) => {
    if (!usuarioLogado) return false;
    
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/pedidos_amizade?` + 
        `or=(id_remetente.eq.${usuarioLogado.id},id_destinatario.eq.${usuarioLogado.id})` +
        `&or=(id_remetente.eq.${remetenteId},id_destinatario.eq.${remetenteId})` +
        `&status=eq.aceito`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const amizades = await response.json();
        return amizades.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Erro ao verificar amizade:', error);
      return false;
    }
  }, [usuarioLogado, getAuthHeaders]);

  const verificarPedidoPendente = useCallback(async (remetenteId) => {
    if (!usuarioLogado) return false;
    
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/pedidos_amizade?` +
        `id_remetente=eq.${remetenteId}&id_destinatario=eq.${usuarioLogado.id}&status=eq.pendente`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const pedidos = await response.json();
        return pedidos.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Erro ao verificar pedido pendente:', error);
      return false;
    }
  }, [usuarioLogado, getAuthHeaders]);

  const responderPedidoAmizade = async (remetenteId, aceitar) => {
    if (!usuarioLogado) return;
    
    try {
      const status = aceitar ? 'aceito' : 'recusado';
      
      const buscaResponse = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/pedidos_amizade?` +
        `id_remetente=eq.${remetenteId}&id_destinatario=eq.${usuarioLogado.id}&status=eq.pendente`,
        { headers: getAuthHeaders() }
      );

      if (!buscaResponse.ok) throw new Error('Erro ao buscar pedido');

      const pedidos = await buscaResponse.json();
      
      if (pedidos.length === 0) {
        alert('Este pedido de amizade não está mais pendente.');
        await carregarNotificacoes();
        return;
      }

      const pedido = pedidos[0];
      
      const updateResponse = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/pedidos_amizade?id=eq.${pedido.id}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            status: status,
            data_resposta: new Date().toISOString()
          })
        }
      );

      if (updateResponse.ok) {
        const remetente = await buscarDadosUsuario(remetenteId);
        
        if (aceitar) {
          await criarNotificacao(
            remetenteId,
            'pedido_aceito',
            usuarioLogado.id,
            `${usuarioLogado.nome} aceitou seu pedido de amizade!`
          );
          
          await criarNotificacao(
            usuarioLogado.id,
            'amizade_confirmada',
            remetenteId,
            `Você e ${remetente?.nome || 'o usuário'} agora são amigos!`
          );
        }
        
        alert(aceitar ? 
          'Agora vocês são amigos! 🎉' : 
          'Pedido de amizade recusado.'
        );
        
        await carregarNotificacoes();
      }
      
    } catch (error) {
      console.error('Erro ao responder pedido:', error);
      alert('Erro ao processar sua resposta. Tente novamente.');
    }
  };

  const redirecionarNotificacao = (notificacao) => {
    switch (notificacao.tipo) {
      case 'curtida':
      case 'comentario':
        navigate(`/post?id=${notificacao.id_origem}`);
        break;
      case 'pedido_amizade':
      case 'pedido_aceito':
      case 'amizade_confirmada':
        navigate(`/perfil/usuario?id=${notificacao.id_origem}`);
        break;
      case 'projeto':
        navigate(`/projeto?id=${notificacao.id_origem}`);
        break;
      default:
        console.log('Tipo de notificação não reconhecido:', notificacao.tipo);
    }
  };

  // ===== CARREGAR NOTIFICAÇÕES =====
  const carregarNotificacoes = useCallback(async () => {
    if (!usuarioLogado || !usuarioLogado.id || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/notificacoes?id_usuario=eq.${usuarioLogado.id}&order=data_criacao.desc&limit=50`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar notificações');
      }

      let notificacoesData = await response.json();
      
      // Enriquecer notificações com dados adicionais (apenas para pedidos pendentes)
      const notificacoesEnriquecidas = await Promise.all(
        notificacoesData.map(async (notif) => {
          if (notif.tipo === 'pedido_amizade' && notif.id_origem && !notif.lida) {
            const [remetente, saoAmigos, pedidoPendente] = await Promise.all([
              buscarDadosUsuario(notif.id_origem),
              verificarAmizade(notif.id_origem),
              verificarPedidoPendente(notif.id_origem)
            ]);
            return {
              ...notif,
              remetente,
              saoAmigos,
              pedidoPendente
            };
          }
          return notif;
        })
      );
      
      if (isMountedRef.current) {
        setNotificacoes(notificacoesEnriquecidas);
        const naoLidas = notificacoesEnriquecidas.filter(n => !n.lida).length;
        setTotalNaoLidas(naoLidas);
        setError(null);
      }
      
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      if (isMountedRef.current) {
        setError('Erro ao carregar notificações. Tente novamente.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      loadingRef.current = false;
    }
  }, [usuarioLogado, getAuthHeaders, buscarDadosUsuario, verificarAmizade, verificarPedidoPendente]);

  // ===== CARREGAR USUÁRIO =====
  const carregarUsuarioLogado = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem('usuarioLogado');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUsuarioLogado(user);
        return true;
      } else {
        navigate('/faca-login');
        return false;
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      return false;
    }
  }, [navigate]);

  // ===== NOTIFICAÇÕES FILTRADAS =====
  const getNotificacoesFiltradas = useCallback(() => {
    let filtradas = [...notificacoes];
    
    switch (filtroAtual) {
      case 'nao_lidas':
        filtradas = filtradas.filter(n => !n.lida);
        break;
      case 'pedidos':
        filtradas = filtradas.filter(n => n.tipo === 'pedido_amizade' || n.tipo === 'pedido_aceito' || n.tipo === 'amizade_confirmada');
        break;
      case 'curtidas':
        filtradas = filtradas.filter(n => n.tipo === 'curtida');
        break;
      case 'comentarios':
        filtradas = filtradas.filter(n => n.tipo === 'comentario');
        break;
    }
    
    return filtradas;
  }, [notificacoes, filtroAtual]);

  // ===== RENDERIZAR NOTIFICAÇÃO =====
  const renderNotificacao = (notif) => {
    const iconeClass = getIconeClasse(notif.tipo);
    const tempo = formatarTempo(notif.data_criacao);
    const naoLidaClass = notif.lida ? '' : 'nao-lida';
    
    let acoesHTML = null;
    let statusHTML = null;
    
    if (notif.tipo === 'pedido_amizade') {
      if (notif.saoAmigos) {
        statusHTML = (
          <div className="notificacao-status amigo">
            <i className="fas fa-check-circle"></i> 
            <span>✓ Vocês já são amigos</span>
          </div>
        );
      } else if (!notif.pedidoPendente) {
        statusHTML = (
          <div className="notificacao-status expirado">
            <i className="fas fa-clock"></i> 
            <span>Pedido expirado ou já respondido</span>
          </div>
        );
      } else {
        acoesHTML = (
          <div className="notificacao-acoes">
            <button className="btn-aceitar" onClick={(e) => {
              e.stopPropagation();
              responderPedidoAmizade(notif.id_origem, true);
            }}>
              <i className="fas fa-check"></i> Aceitar
            </button>
            <button className="btn-recusar" onClick={(e) => {
              e.stopPropagation();
              responderPedidoAmizade(notif.id_origem, false);
            }}>
              <i className="fas fa-times"></i> Recusar
            </button>
          </div>
        );
      }
    } else if (notif.tipo === 'pedido_aceito' || notif.tipo === 'amizade_confirmada') {
      statusHTML = (
        <div className="notificacao-status sucesso">
          <i className="fas fa-check-circle"></i> 
          <span>Amizade confirmada!</span>
        </div>
      );
    }

    let nomeRemetente = '';
    if (notif.remetente) {
      nomeRemetente = ` de ${notif.remetente.nome}`;
    }

    return (
      <div 
        key={notif.id} 
        className={`notificacao-item ${naoLidaClass}`}
        onClick={() => {
          if (!notif.lida) marcarComoLida(notif.id);
          redirecionarNotificacao(notif);
        }}
      >
        <div className={`notificacao-icone ${iconeClass}`}>
          <i className={getIcone(notif.tipo)}></i>
        </div>
        <div className="notificacao-conteudo">
          <div className="notificacao-mensagem">{notif.mensagem}{nomeRemetente}</div>
          {statusHTML}
          <div className="notificacao-tempo">
            <i className="far fa-clock"></i> {tempo}
          </div>
        </div>
        {acoesHTML}
        {!notif.lida && !statusHTML && (
          <button 
            className="btn-marcar-lida"
            onClick={(e) => {
              e.stopPropagation();
              marcarComoLida(notif.id);
            }}
          >
            <i className="fas fa-check"></i>
          </button>
        )}
      </div>
    );
  };

  // ===== INIT =====
  useEffect(() => {
    isMountedRef.current = true;
    
    const init = async () => {
      const logged = await carregarUsuarioLogado();
      if (logged) {
        await carregarNotificacoes();
      }
    };
    
    init();
    
    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [carregarUsuarioLogado, carregarNotificacoes]);

  // ===== POLLING PARA NOVAS NOTIFICAÇÕES =====
  useEffect(() => {
    if (usuarioLogado && isMountedRef.current) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      pollingIntervalRef.current = setInterval(() => {
        if (isMountedRef.current && !loadingRef.current) {
          carregarNotificacoes();
        }
      }, 30000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [usuarioLogado, carregarNotificacoes]);

  const notificacoesFiltradas = getNotificacoesFiltradas();

  if (error) {
    return (
      <>
        <header className="notificacoes-topbar">
          <div className="topbar-container">
            <h1><a href="/aria-trabalho" style={{ textDecoration: 'none', color: 'inherit' }}>Freelance<span>Hub</span></a></h1>
            <div className="topbar-user" onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
              <img src={usuarioLogado?.avatar_url || DEFAULT_AVATAR} alt="Perfil" className="topbar-avatar" />
              <span>{usuarioLogado?.nome || 'Carregando...'}</span>
            </div>
          </div>
        </header>
        <main className="notificacoes-main">
          <div className="notificacoes-container">
            <div className="sem-notificacoes">
              <i className="fas fa-exclamation-triangle" style={{ color: '#dc3545' }}></i>
              <p>{error}</p>
              <button onClick={() => window.location.reload()} style={{ marginTop: '15px', padding: '8px 16px', background: '#0a66c2', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Tentar novamente
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="notificacoes-topbar">
        <div className="topbar-container">
          <h1>
            <a href="/aria-trabalho" style={{ textDecoration: 'none', color: 'inherit' }}>
              Freelance<span>Hub</span>
            </a>
          </h1>
          <div className="topbar-user" onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
            <img src={usuarioLogado?.avatar_url || DEFAULT_AVATAR} alt="Perfil" className="topbar-avatar" />
            <span>{usuarioLogado?.nome || 'Carregando...'}</span>
          </div>
        </div>
      </header>

      <main className="notificacoes-main">
        <div className="notificacoes-container">
          <div className="notificacoes-header">
            <h2><i className="fas fa-bell"></i> Notificações</h2>
            <div className="notificacoes-actions">
              <button className="btn-marcar-todas" onClick={marcarTodasComoLidas}>
                <i className="fas fa-check-double"></i> Marcar todas como lidas
              </button>
            </div>
          </div>

          <div className="notificacoes-tabs">
            <button 
              className={`tab-btn ${filtroAtual === 'todas' ? 'active' : ''}`}
              onClick={() => setFiltroAtual('todas')}
            >
              Todas
            </button>
            <button 
              className={`tab-btn ${filtroAtual === 'nao_lidas' ? 'active' : ''}`}
              onClick={() => setFiltroAtual('nao_lidas')}
            >
              Não lidas
              {totalNaoLidas > 0 && <span className="tab-badge">{totalNaoLidas}</span>}
            </button>
            <button 
              className={`tab-btn ${filtroAtual === 'pedidos' ? 'active' : ''}`}
              onClick={() => setFiltroAtual('pedidos')}
            >
              Pedidos de amizade
            </button>
            <button 
              className={`tab-btn ${filtroAtual === 'curtidas' ? 'active' : ''}`}
              onClick={() => setFiltroAtual('curtidas')}
            >
              Curtidas
            </button>
            <button 
              className={`tab-btn ${filtroAtual === 'comentarios' ? 'active' : ''}`}
              onClick={() => setFiltroAtual('comentarios')}
            >
              Comentários
            </button>
          </div>

          <div className="notificacoes-lista">
            {isLoading ? (
              <div className="loading-spinner">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Carregando notificações...</p>
              </div>
            ) : notificacoesFiltradas.length === 0 ? (
              <div className="sem-notificacoes">
                <i className="fas fa-bell-slash"></i>
                <p>Nenhuma notificação encontrada</p>
              </div>
            ) : (
              notificacoesFiltradas.map(notif => renderNotificacao(notif))
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Notificacoes;