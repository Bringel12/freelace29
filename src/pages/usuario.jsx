import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Perfil_usuairo.css';

// Configuração do Supabase
const SUPABASE_URL = 'https://tgnwbxcygmjipupufoix.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbndieGN5Z21qaXB1cHVmb2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDI4NDcsImV4cCI6MjA4NzE3ODg0N30.78BjN7G0a0lnUwXmveggL0GQD-Xp-5C7QYUBmfOIt_s';

// Status de amizade no banco de dados
const STATUS_APROVADO = 'acelto';

const Usuario = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('id');

  // Estados
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [perfilVisitado, setPerfilVisitado] = useState(null);
  const [posts, setPosts] = useState([]);
  const [seguidores, setSeguidores] = useState([]);
  const [seguindo, setSeguindo] = useState([]);
  const [estaSeguindo, setEstaSeguindo] = useState(false);
  const [saoAmigos, setSaoAmigos] = useState(false);
  const [amigosEmComum, setAmigosEmComum] = useState([]);
  const [sobreMim, setSobreMim] = useState('');
  const [habilidades, setHabilidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  // Constantes
  const DEFAULT_AVATAR = '/img/711769.png';

  // ===== CARREGAMENTO INICIAL =====
  useEffect(() => {
    const inicializar = async () => {
      await carregarUsuarioLogado();
    };
    inicializar();
  }, []);

  useEffect(() => {
    if (userId && usuarioLogado !== undefined) {
      carregarDadosUsuario();
    }
  }, [userId, usuarioLogado]);

  // ===== FUNÇÕES DE AUTENTICAÇÃO =====
  const carregarUsuarioLogado = async () => {
    try {
      const storedUser = localStorage.getItem('usuarioLogado');
      if (storedUser) {
        setUsuarioLogado(JSON.parse(storedUser));
      } else {
        setUsuarioLogado(null);
      }
    } catch (e) {
      console.error('Erro ao carregar usuário:', e);
      setUsuarioLogado(null);
    }
  };

  const getAuthHeaders = () => ({
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  });

  // ===== CARREGAR DADOS DO USUÁRIO =====
  const carregarDadosUsuario = async () => {
    setLoading(true);
    try {
      await Promise.all([
        carregarPerfilUsuario(),
        carregarPostsUsuario(),
        carregarSeguidores(),
        carregarSeguindo(),
        carregarSobreMim(),
        carregarHabilidades()
      ]);

      if (usuarioLogado && usuarioLogado.id != userId) {
        await verificarRelacionamento();
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarPerfilUsuario = async () => {
    try {
      // Carregar dados do usuário
      const userResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}`,
        { headers: getAuthHeaders() }
      );

      if (userResponse.ok) {
        const usuarios = await userResponse.json();
        if (usuarios.length > 0) {
          setPerfilVisitado(usuarios[0]);
        }
      }

      // Carregar foto do perfil
      const perfilResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${userId}&select=avatar_url`,
        { headers: getAuthHeaders() }
      );

      if (perfilResponse.ok) {
        const perfis = await perfilResponse.json();
        if (perfis.length > 0 && perfis[0].avatar_url) {
          setPerfilVisitado(prev => ({
            ...prev,
            avatar_url: perfis[0].avatar_url
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  // ===== NOVAS FUNÇÕES PARA SOBRE MIM E HABILIDADES =====
  const carregarSobreMim = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${userId}&select=sobre_mim`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const perfis = await response.json();
        if (perfis.length > 0 && perfis[0].sobre_mim) {
          setSobreMim(perfis[0].sobre_mim);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar sobre mim:', error);
    }
  };

  const carregarHabilidades = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/habilidades?id_usuario=eq.${userId}`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const habilidadesData = await response.json();
        setHabilidades(habilidadesData);
      }
    } catch (error) {
      console.error('Erro ao carregar habilidades:', error);
    }
  };

  // ===== FUNÇÕES DE RELACIONAMENTO =====
  const verificarRelacionamento = async () => {
    if (!usuarioLogado) return;

    try {
      const userIdNum = parseInt(userId);
      const logadoIdNum = parseInt(usuarioLogado.id);

      // Verificar se o usuário logado segue este perfil
      const segueResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/pedidos_amizade?id_remetente=eq.${logadoIdNum}&id_destinatario=eq.${userIdNum}&status=eq.${STATUS_APROVADO}`,
        { headers: getAuthHeaders() }
      );

      if (segueResponse.ok) {
        const segue = await segueResponse.json();
        setEstaSeguindo(segue.length > 0);
      }

      // Verificar se o perfil visitado segue o usuário logado
      const amigoResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/pedidos_amizade?id_remetente=eq.${userIdNum}&id_destinatario=eq.${logadoIdNum}&status=eq.${STATUS_APROVADO}`,
        { headers: getAuthHeaders() }
      );

      if (amigoResponse.ok) {
        const amigo = await amigoResponse.json();
        const segueDeVolta = amigo.length > 0;
        setSaoAmigos(estaSeguindo && segueDeVolta);
      }

      // Carregar amigos em comum
      await carregarAmigosEmComum(userIdNum);
    } catch (error) {
      console.error('Erro ao verificar relacionamento:', error);
    }
  };

  const toggleRelacionamento = async () => {
    if (!usuarioLogado) {
      alert('Faça login para seguir usuários!');
      navigate('/faca-login');
      return;
    }

    try {
      const userIdNum = parseInt(userId);
      const logadoIdNum = parseInt(usuarioLogado.id);

      if (estaSeguindo) {
        // Deixar de seguir
        await fetch(
          `${SUPABASE_URL}/rest/v1/pedidos_amizade?id_remetente=eq.${logadoIdNum}&id_destinatario=eq.${userIdNum}&status=eq.${STATUS_APROVADO}`,
          {
            method: 'DELETE',
            headers: getAuthHeaders()
          }
        );
        setEstaSeguindo(false);
        setSaoAmigos(false);
      } else {
        // Seguir
        await fetch(`${SUPABASE_URL}/rest/v1/pedidos_amizade`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            id_remetente: logadoIdNum,
            id_destinatario: userIdNum,
            status: STATUS_APROVADO,
            data_pedido: new Date().toISOString()
          })
        });
        setEstaSeguindo(true);

        // Verificar se agora são amigos
        const amigoResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/pedidos_amizade?id_remetente=eq.${userIdNum}&id_destinatario=eq.${logadoIdNum}&status=eq.${STATUS_APROVADO}`,
          { headers: getAuthHeaders() }
        );

        if (amigoResponse.ok) {
          const amigo = await amigoResponse.json();
          setSaoAmigos(amigo.length > 0);
        }
      }

      // Recarregar contadores
      await Promise.all([
        carregarSeguidores(),
        carregarSeguindo(),
        carregarAmigosEmComum(userIdNum)
      ]);

    } catch (error) {
      console.error('Erro ao processar relacionamento:', error);
      alert('Erro ao processar solicitação. Tente novamente.');
    }
  };

  const carregarAmigosEmComum = async (userIdNum) => {
    if (!usuarioLogado) return;

    try {
      // Buscar quem o usuário logado segue
      const seguindoResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/pedidos_amizade?id_remetente=eq.${usuarioLogado.id}&status=eq.${STATUS_APROVADO}`,
        { headers: getAuthHeaders() }
      );

      // Buscar quem o perfil visitado segue
      const perfilSeguindoResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/pedidos_amizade?id_remetente=eq.${userIdNum}&status=eq.${STATUS_APROVADO}`,
        { headers: getAuthHeaders() }
      );

      if (seguindoResponse.ok && perfilSeguindoResponse.ok) {
        const seguindo = await seguindoResponse.json();
        const perfilSeguindo = await perfilSeguindoResponse.json();

        const seguindoIds = seguindo.map(s => s.id_destinatario);
        const perfilSeguindoIds = perfilSeguindo.map(ps => ps.id_destinatario);

        const amigosEmComumIds = seguindoIds.filter(id => perfilSeguindoIds.includes(id));
        
        // Buscar dados dos amigos em comum
        const amigosData = await Promise.all(
          amigosEmComumIds.slice(0, 3).map(async (id) => {
            const userResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${id}`,
              { headers: getAuthHeaders() }
            );
            
            if (userResponse.ok) {
              const usuarios = await userResponse.json();
              if (usuarios.length > 0) {
                const perfilResponse = await fetch(
                  `${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${id}&select=avatar_url`,
                  { headers: getAuthHeaders() }
                );
                
                let avatarUrl = DEFAULT_AVATAR;
                if (perfilResponse.ok) {
                  const perfis = await perfilResponse.json();
                  if (perfis.length > 0 && perfis[0].avatar_url) {
                    avatarUrl = perfis[0].avatar_url;
                  }
                }
                
                return {
                  id,
                  nome: usuarios[0].nome || 'Usuário',
                  avatar_url: avatarUrl
                };
              }
            }
            return null;
          })
        );

        setAmigosEmComum(amigosData.filter(a => a !== null));
      }
    } catch (error) {
      console.error('Erro ao carregar amigos em comum:', error);
    }
  };

  // ===== FUNÇÕES DE POSTS =====
  const carregarPostsUsuario = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/posts?id_usuario=eq.${userId}&order=data_postagem.desc`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const postsData = await response.json();
        setPosts(postsData);
      }
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    }
  };

  // ===== FUNÇÕES DE SEGUIDORES =====
  const carregarSeguidores = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/pedidos_amizade?id_destinatario=eq.${userId}&status=eq.${STATUS_APROVADO}`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const seguidoresData = await response.json();
        setSeguidores(seguidoresData);
      }
    } catch (error) {
      console.error('Erro ao carregar seguidores:', error);
    }
  };

  const carregarSeguindo = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/pedidos_amizade?id_remetente=eq.${userId}&status=eq.${STATUS_APROVADO}`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const seguindoData = await response.json();
        setSeguindo(seguindoData);
      }
    } catch (error) {
      console.error('Erro ao carregar seguindo:', error);
    }
  };

  // ===== FUNÇÕES AUXILIARES =====
  const calcularTempoRelativo = (data) => {
    if (!data) return 'agora mesmo';
    
    const diffMin = Math.floor((new Date() - new Date(data)) / 60000);
    
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffMin < 1440) return `há ${Math.floor(diffMin / 60)} h`;
    if (diffMin < 43200) return `há ${Math.floor(diffMin / 1440)} d`;
    return `há ${Math.floor(diffMin / 43200)} meses`;
  };

  const redirecionarParaPerfil = (id) => {
    if (!usuarioLogado) {
      navigate('/faca-login');
      return;
    }
    
    if (String(id) === String(usuarioLogado.id)) {
      navigate('/perfil');
    } else {
      navigate(`/perfil/usuario?id=${id}`);
    }
  };

  const abrirModal = (url) => {
    window.open(url, '_blank');
  };

  const voltarParaFeed = () => {
    navigate('/aria-trabalho');
  };

  // ===== RENDERIZAÇÃO =====
  if (loading) {
    return (
      <div className="usuario-container">
        <div className="usuario-loading">
          <i className="fas fa-spinner fa-spin"></i> Carregando perfil...
        </div>
      </div>
    );
  }

  if (!perfilVisitado) {
    return (
      <div className="usuario-container">
        <button className="usuario-back-button" onClick={voltarParaFeed}>
          <i className="fas fa-arrow-left"></i> Voltar ao Feed
        </button>
        <div className="usuario-profile-header" style={{ textAlign: 'center', padding: '50px' }}>
          <h1>Usuário não encontrado</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="usuario-container">
      <button className="usuario-back-button" onClick={voltarParaFeed}>
        <i className="fas fa-arrow-left"></i> Voltar ao Feed
      </button>

      <div className="usuario-profile-header">
        <img 
          src={perfilVisitado?.avatar_url || DEFAULT_AVATAR} 
          alt="Avatar" 
          className="usuario-profile-avatar"
        />
        <div className="usuario-profile-info">
          <h1>{perfilVisitado?.nome || 'Usuário'}</h1>
          
          {usuarioLogado && usuarioLogado.id != userId && (
            <button 
              className="usuario-relationship-button"
              onClick={toggleRelacionamento}
              style={{
                backgroundColor: saoAmigos ? '#28a745' : (estaSeguindo ? '#dc3545' : '#0a66c2')
              }}
            >
              {saoAmigos ? 'Amigos ✓' : (estaSeguindo ? 'Seguindo' : 'Seguir')}
            </button>
          )}

          <div className="usuario-profile-stats">
            <div className="usuario-stat">
              <div className="usuario-stat-value">{posts.length}</div>
              <div className="usuario-stat-label">Posts</div>
            </div>
            <div className="usuario-stat">
              <div className="usuario-stat-value">{seguidores.length}</div>
              <div className="usuario-stat-label">Seguidores</div>
            </div>
            <div className="usuario-stat">
              <div className="usuario-stat-value">{seguindo.length}</div>
              <div className="usuario-stat-label">Seguindo</div>
            </div>
          </div>

          {amigosEmComum.length > 0 && (
            <div className="usuario-mutual-friends-container">
              <div className="usuario-mutual-friends-title">
                <i className="fas fa-users"></i> Amigos em comum ({amigosEmComum.length})
              </div>
              <div className="usuario-mutual-friends-list">
                {amigosEmComum.map(amigo => (
                  <div 
                    key={amigo.id} 
                    className="usuario-mutual-friend-item"
                    onClick={() => redirecionarParaPerfil(amigo.id)}
                  >
                    <img 
                      src={amigo.avatar_url} 
                      alt="Avatar" 
                      className="usuario-mutual-friend-avatar"
                    />
                    <span className="usuario-mutual-friend-name">{amigo.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== NOVAS SEÇÕES: SOBRE MIM E HABILIDADES ===== */}
      {(sobreMim || habilidades.length > 0) && (
        <div className="usuario-about-section">
          {sobreMim && (
            <div className="usuario-about-card">
              <h3><i className="fas fa-user"></i> Sobre Mim</h3>
              <p>{sobreMim}</p>
            </div>
          )}
          
          {habilidades.length > 0 && (
            <div className="usuario-skills-card">
              <h3><i className="fas fa-code"></i> Habilidades</h3>
              <div className="usuario-skills-list">
                {habilidades.map((skill, index) => (
                  <span key={index} className="usuario-skill-tag">
                    {skill.nome}
                    {skill.nivel && <span className="usuario-skill-level">{skill.nivel}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="usuario-profile-tabs">
        <button 
          className={`usuario-tab-button ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts
        </button>
        <button 
          className={`usuario-tab-button ${activeTab === 'seguidores' ? 'active' : ''}`}
          onClick={() => setActiveTab('seguidores')}
        >
          Seguidores
        </button>
        <button 
          className={`usuario-tab-button ${activeTab === 'seguindo' ? 'active' : ''}`}
          onClick={() => setActiveTab('seguindo')}
        >
          Seguindo
        </button>
      </div>

      <div className="usuario-tab-content active">
        {activeTab === 'posts' && (
          <div className="usuario-posts-container">
            <div className="usuario-posts-title">Posts do Usuário</div>
            {posts.length === 0 ? (
              <div className="usuario-empty-state">
                <i className="fas fa-newspaper"></i>
                <p>Nenhum post encontrado.</p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="usuario-post-card">
                  <p className="usuario-post-time">
                    {calcularTempoRelativo(post.data_postagem)}
                  </p>
                  {post.conteudo && (
                    <p className="usuario-post-content">{post.conteudo}</p>
                  )}
                  {post.midias && post.midias.length > 0 && (
                    <div className="usuario-post-midias">
                      {post.midias.map((url, index) => {
                        const imageUrl = url.startsWith('http') ? url : `${SUPABASE_URL}/storage/v1/object/public/${url}`;
                        return (
                          <img 
                            key={index}
                            src={imageUrl} 
                            className="usuario-post-midia"
                            onClick={() => abrirModal(imageUrl)}
                            alt="Mídia do post"
                          />
                        );
                      })}
                    </div>
                  )}
                  {post.orcamento && (
                    <p className="usuario-post-orcamento">
                      💰 R$ {parseFloat(post.orcamento).toFixed(2)}
                    </p>
                  )}
                  {post.categoria && (
                    <p className="usuario-post-categoria">#{post.categoria}</p>
                  )}
                  <div className="usuario-post-stats">
                    <span>
                      <i className="far fa-heart"></i> {post.curtidas || 0}
                    </span>
                    <span>
                      <i className="far fa-comment"></i> {post.comentarios || 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'seguidores' && (
          <div className="usuario-followers-container">
            <h4>Seguidores</h4>
            {seguidores.length === 0 ? (
              <div className="usuario-empty-state">
                <i className="fas fa-users"></i>
                <p>Nenhum seguidor ainda.</p>
              </div>
            ) : (
              seguidores.map(seguidor => (
                <UsuarioItem 
                  key={seguidor.id_remetente}
                  userId={seguidor.id_remetente}
                  usuarioLogado={usuarioLogado}
                  onVerPerfil={redirecionarParaPerfil}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'seguindo' && (
          <div className="usuario-following-container">
            <h4>Seguindo</h4>
            {seguindo.length === 0 ? (
              <div className="usuario-empty-state">
                <i className="fas fa-user-friends"></i>
                <p>Não segue ninguém ainda.</p>
              </div>
            ) : (
              seguindo.map(segue => (
                <UsuarioItem 
                  key={segue.id_destinatario}
                  userId={segue.id_destinatario}
                  usuarioLogado={usuarioLogado}
                  onVerPerfil={redirecionarParaPerfil}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente auxiliar para exibir usuários na lista
const UsuarioItem = ({ userId, usuarioLogado, onVerPerfil }) => {
  const [usuario, setUsuario] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('/img/711769.png');
  const [segueDeVolta, setSegueDeVolta] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [userId]);

  const carregarDados = async () => {
    try {
      // Carregar dados do usuário
      const userResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (userResponse.ok) {
        const usuarios = await userResponse.json();
        if (usuarios.length > 0) {
          setUsuario(usuarios[0]);
        }
      }

      // Carregar foto do perfil
      const perfilResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${userId}&select=avatar_url`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (perfilResponse.ok) {
        const perfis = await perfilResponse.json();
        if (perfis.length > 0 && perfis[0].avatar_url) {
          setAvatarUrl(perfis[0].avatar_url);
        }
      }

      // Verificar se o usuário logado é seguido de volta
      if (usuarioLogado) {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/pedidos_amizade?id_remetente=eq.${userId}&id_destinatario=eq.${usuarioLogado.id}&status=eq.${STATUS_APROVADO}`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        );

        if (response.ok) {
          const segue = await response.json();
          setSegueDeVolta(segue.length > 0);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="usuario-user-list-item">
        <div style={{ textAlign: 'center', width: '100%' }}>Carregando...</div>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <div className="usuario-user-list-item">
      <img src={avatarUrl} alt="Avatar" className="usuario-user-list-avatar" />
      <div className="usuario-user-list-info">
        <strong>{usuario.nome || 'Usuário'}</strong>
        {segueDeVolta && <span className="usuario-friend-badge">Amigo</span>}
      </div>
      <button 
        className="usuario-view-profile-btn"
        onClick={() => onVerPerfil(userId)}
      >
        Ver Perfil
      </button>
    </div>
  );
};

export default Usuario;
