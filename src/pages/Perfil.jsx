
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Perfil.css';

const Perfil = () => {
  const navigate = useNavigate();
  
  // ===== CONFIGURAÇÃO SUPABASE =====
  const SUPABASE_URL = 'https://tgnwbxcygmjipupufoix.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbndieGN5Z21qaXB1cHVmb2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDI4NDcsImV4cCI6MjA4NzE3ODg0N30.78BjN7G0a0lnUwXmveggL0GQD-Xp-5C7QYUBmfOIt_s';

  // ===== ESTADOS =====
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [usuarioPerfil, setUsuarioPerfil] = useState(null);
  const [projetos, setProjetos] = useState([]);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('projects');
  const [modalAberto, setModalAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estados para o formulário de edição
  const [formData, setFormData] = useState({
    nome: '',
    bio: '',
    github: '',
    linkedin: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
    disponivel: true
  });
  
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // ===== EFEITOS =====
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  // ===== FUNÇÕES PRINCIPAIS =====
  const carregarDadosIniciais = async () => {
    setLoading(true);
    await carregarUsuarioLogado();
    setLoading(false);
  };

  const carregarUsuarioLogado = async () => {
    try {
      const usuarioStorage = localStorage.getItem('usuarioLogado');
      if (!usuarioStorage) {
        navigate('/faca-login');
        return;
      }

      const user = JSON.parse(usuarioStorage);
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${user.id}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (response.ok) {
        const usuarios = await response.json();
        if (usuarios.length > 0) {
          setUsuarioLogado(usuarios[0]);
          localStorage.setItem('usuarioLogado', JSON.stringify(usuarios[0]));
          
          await carregarPerfilUsuario(usuarios[0].id);
          await carregarProjetos(usuarios[0].id);
          await carregarPosts(usuarios[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  };

  const carregarPerfilUsuario = async (userId) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${userId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (response.ok) {
        const perfis = await response.json();
        if (perfis.length > 0) {
          setUsuarioPerfil(perfis[0]);
        } else {
          await criarPerfilPadrao(userId);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const criarPerfilPadrao = async (userId) => {
    try {
      const novoPerfil = {
        id_usuarios: userId,
        bio: '',
        avatar_url: null,
        cidade: 'São Paulo',
        estado: 'SP',
        pais: 'Brasil',
        disponivel: true,
        github: '',
        linkedin: '',
        data_atualizacao: new Date().toISOString()
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/perfil`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(novoPerfil)
      });

      if (response.ok) {
        const perfilCriado = await response.json();
        setUsuarioPerfil(perfilCriado);
      }
    } catch (error) {
      console.error('Erro ao criar perfil padrão:', error);
    }
  };

  const carregarProjetos = async (userId) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/projetos?id_usuario=eq.${userId}&order=data_criacao.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (response.ok) {
        const projetosData = await response.json();
        setProjetos(projetosData);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  const carregarPosts = async (userId) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/posts?id_usuario=eq.${userId}&order=data_postagem.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (response.ok) {
        const postsData = await response.json();
        setPosts(postsData);
      }
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    }
  };

  // ===== FUNÇÕES DO MODAL =====
  const abrirModal = () => {
    setFormData({
      nome: usuarioLogado?.nome || '',
      bio: usuarioPerfil?.bio || '',
      github: usuarioPerfil?.github || '',
      linkedin: usuarioPerfil?.linkedin || '',
      cidade: usuarioPerfil?.cidade || '',
      estado: usuarioPerfil?.estado || '',
      pais: usuarioPerfil?.pais || 'Brasil',
      disponivel: usuarioPerfil?.disponivel !== false
    });
    setFotoPreview(usuarioPerfil?.avatar_url || '/img/711769.png');
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setFotoFile(null);
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removerFoto = () => {
    setFotoFile(null);
    setFotoPreview('/img/711769.png');
  };

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const uploadFoto = async (file) => {
    const bucketName = 'postagens';
    const fileName = `perfil/${usuarioLogado.id}_${Date.now()}.jpg`;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${fileName}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: formData
    });
    
    if (uploadResponse.ok) {
      return `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`;
    } else {
      throw new Error('Erro no upload da foto');
    }
  };

  const salvarAlteracoes = async (e) => {
    e.preventDefault();
    setSalvando(true);
    
    try {
      let avatar_url = usuarioPerfil?.avatar_url;
      
      if (fotoFile) {
        avatar_url = await uploadFoto(fotoFile);
      }

      // Atualizar nome na tabela usuarios
      const usuarioResponse = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${usuarioLogado.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ nome: formData.nome })
      });

      if (!usuarioResponse.ok) throw new Error('Erro ao atualizar nome');

      // Atualizar perfil
      const perfilData = {
        bio: formData.bio,
        github: formData.github,
        linkedin: formData.linkedin,
        cidade: formData.cidade,
        estado: formData.estado,
        pais: formData.pais,
        disponivel: formData.disponivel,
        avatar_url: avatar_url,
        data_atualizacao: new Date().toISOString()
      };

      const perfilResponse = await fetch(`${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${usuarioLogado.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(perfilData)
      });

      if (perfilResponse.ok) {
        const perfilAtualizado = await perfilResponse.json();
        
        setUsuarioLogado(prev => ({ ...prev, nome: formData.nome }));
        setUsuarioPerfil(perfilAtualizado[0] || perfilAtualizado);
        
        localStorage.setItem('usuarioLogado', JSON.stringify({ 
          ...usuarioLogado, 
          nome: formData.nome 
        }));
        
        alert('Perfil atualizado com sucesso!');
        fecharModal();
      } else {
        throw new Error('Erro ao atualizar perfil');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar alterações: ' + error.message);
    } finally {
      setSalvando(false);
    }
  };

  // ===== FUNÇÕES AUXILIARES =====
  const getUrlCompletaImagem = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${SUPABASE_URL}${url}`;
    return `${SUPABASE_URL}/storage/v1/object/public/postagens/${url}`;
  };

  const calcularTempoRelativo = (data) => {
    const agora = new Date();
    const dataPost = new Date(data);
    const diffMin = Math.floor((agora - dataPost) / 60000);
    
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffMin < 1440) return `há ${Math.floor(diffMin / 60)} h`;
    if (diffMin < 43200) return `há ${Math.floor(diffMin / 1440)} d`;
    return `há ${Math.floor(diffMin / 43200)} meses`;
  };

  // ===== RENDERIZAÇÃO =====
  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="perfil-page">
      {/* Topbar */}
      <div className="topbar">
        <div className="logo" onClick={() => navigate('/aria-trabalho')} style={{ cursor: 'pointer' }}>
          FreelanceHub
        </div>
        <div className="topbar-icons">

          <img 
            src={usuarioPerfil?.avatar_url || '/img/711769.png'} 
            alt="Perfil" 
            className="profile-pic-small" 
            onClick={() => navigate('/perfil')}
          />
        </div>
      </div>

      {/* Container Principal */}
      <div className="profile-container">
        {/* Sidebar Esquerda */}
        <div className="sidebar-left">
          <div className="profile-card">
            <div className="profile-cover"></div>
            <div className="profile-info">
              <img 
                src={usuarioPerfil?.avatar_url || '/img/711769.png'} 
                alt="Foto de perfil" 
                className="profile-pic-large" 
              />
              <h2>{usuarioLogado?.nome || 'Carregando...'}</h2>
              <p className="profile-email">{usuarioLogado?.email || 'carregando@email.com'}</p>
              <p className="profile-bio">{usuarioPerfil?.bio || 'Sem biografia definida'}</p>
              <button className="edit-profile-btn" onClick={abrirModal}>
                <i className="fas fa-pen"></i> Editar Perfil
              </button>
            </div>
            
            {/* DETALHES DO PERFIL */}
            <div className="profile-details">
              <div className="detail-item">
                <i className="fas fa-map-marker-alt"></i>
                <span>
                  {usuarioPerfil?.cidade && usuarioPerfil?.estado 
                    ? `${usuarioPerfil.cidade}, ${usuarioPerfil.estado}`
                    : usuarioPerfil?.cidade || usuarioPerfil?.estado || 'Localização não informada'}
                </span>
              </div>
              <div className="detail-item">
                <i className="fas fa-briefcase"></i>
                <span>{usuarioPerfil?.disponivel ? 'Disponível para projetos' : 'Indisponível'}</span>
              </div>
              <div className="detail-item">
                <i className="fas fa-calendar-alt"></i>
                <span>Membro desde {usuarioLogado?.data_cadastro ? new Date(usuarioLogado.data_cadastro).getFullYear() : new Date().getFullYear()}</span>
              </div>
            </div>
            
            <div className="profile-stats">
              <div className="stat">
                <span className="stat-value">{posts.length}</span>
                <span className="stat-label">Posts</span>
              </div>
              <div className="stat">
                <span className="stat-value">{projetos.length}</span>
                <span className="stat-label">Projetos</span>
              </div>
              <div className="stat">
                <span className="stat-value">0</span>
                <span className="stat-label">Seguidores</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Central */}
        <div className="main-content">
          {/* Tabs de navegação */}
          <div className="profile-tabs">
            <button 
              className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <i className="fas fa-code-branch"></i> Projetos
            </button>
            <button 
              className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              <i className="fas fa-pen"></i> Posts
            </button>
            <button 
              className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <i className="fas fa-info-circle"></i> Sobre
            </button>
          </div>

          {/* Conteúdo dos Projetos */}
          {activeTab === 'projects' && (
            <div className="tab-content active">
              <div className="projects-grid">
                {projetos.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-rocket" style={{ fontSize: '48px', color: '#ccc', marginBottom: '15px' }}></i>
                    <p style={{ color: '#666' }}>Nenhum projeto cadastrado ainda</p>
                    <button 
                      className="btn-primary" 
                      style={{ marginTop: '10px', padding: '10px 20px' }}
                      onClick={() => navigate('/postar-projeto')}
                    >
                      <i className="fas fa-plus"></i> Criar Projeto
                    </button>
                  </div>
                ) : (
                  projetos.map(projeto => {
                    const midias = projeto.midias || [];
                    const primeiraMidia = midias.length > 0 ? getUrlCompletaImagem(midias[0]) : null;
                    const tecnologias = projeto.tecnologias || [];
                    
                    const statusMap = {
                      'em_andamento': { text: '🚧 Em Andamento', color: '#ffc107' },
                      'concluido': { text: '✅ Concluído', color: '#28a745' },
                      'pausado': { text: '⏸️ Pausado', color: '#dc3545' },
                      'planejamento': { text: '📋 Planejamento', color: '#17a2b8' }
                    };
                    
                    const status = statusMap[projeto.status] || { text: '📌 Em Andamento', color: '#6c757d' };
                    
                    return (
                      <div key={projeto.id} className="project-card">
                        {primeiraMidia ? (
                          <div className="project-media" style={{ height: '150px', overflow: 'hidden' }}>
                            <img src={primeiraMidia} alt={projeto.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ height: '80px', background: 'linear-gradient(135deg, #0a66c2, #054a92)' }}></div>
                        )}
                        
                        <div className="project-header">
                          <h3>{projeto.titulo || 'Sem título'}</h3>
                          <span className="project-tech" style={{ background: status.color, color: 'white' }}>
                            {status.text}
                          </span>
                        </div>
                        
                        <p className="project-description">
                          {projeto.descricao?.length > 100 
                            ? projeto.descricao.substring(0, 100) + '...' 
                            : projeto.descricao || 'Sem descrição'}
                        </p>
                        
                        {tecnologias.length > 0 && (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '15px' }}>
                            {tecnologias.slice(0, 3).map((tech, i) => (
                              <span key={i} className="skill-tag" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="project-footer">
                          <span className="project-date">
                            {projeto.data_criacao ? new Date(projeto.data_criacao).toLocaleDateString('pt-BR') : 'Data não informada'}
                          </span>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <span><i className="far fa-heart"></i> {projeto.curtidas || 0}</span>
                            <span><i className="far fa-comment"></i> {projeto.comentarios || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Conteúdo dos Posts */}
          {activeTab === 'posts' && (
            <div className="tab-content active">
              <div className="posts-grid">
                {posts.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-pen" style={{ fontSize: '48px', color: '#ccc', marginBottom: '15px' }}></i>
                    <p style={{ color: '#666' }}>Nenhum post publicado ainda</p>
                  </div>
                ) : (
                  posts.map(post => {
                    const primeiraMidia = post.midias && post.midias.length > 0 ? getUrlCompletaImagem(post.midias[0]) : null;
                    
                    return (
                      <div key={post.id} className="post-card">
                        {primeiraMidia && (
                          <div className="post-media">
                            <img src={primeiraMidia} alt="Post" />
                          </div>
                        )}
                        <div className="post-content">
                          <h4>{post.conteudo?.substring(0, 40)}{post.conteudo?.length > 40 ? '...' : ''}</h4>
                          <p>{calcularTempoRelativo(post.data_postagem)}</p>
                          <div className="post-stats">
                            <span><i className="fas fa-heart"></i> {post.curtidas || 0}</span>
                            <span><i className="fas fa-comment"></i> {post.comentarios || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Conteúdo Sobre */}
          {activeTab === 'about' && (
            <div className="tab-content active">
              <div className="about-content">
                <h3>Sobre Mim</h3>
                <p>{usuarioPerfil?.bio || 'Nenhuma biografia definida'}</p>
                
                <h3>Habilidades</h3>
                <div className="skills-container">
                  {/* Você pode adicionar habilidades aqui */}
                </div>
                
                <h3>Links</h3>
                <div className="links-container">
                  {usuarioPerfil?.github && (
                    <a href={usuarioPerfil.github} className="social-link" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-github"></i> GitHub
                    </a>
                  )}
                  {usuarioPerfil?.linkedin && (
                    <a href={usuarioPerfil.linkedin} className="social-link" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-linkedin"></i> LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {modalAberto && (
        <div className="edit-modal" style={{ display: 'block' }}>
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>Editar Perfil</h2>
              <span className="close-modal" onClick={fecharModal}>&times;</span>
            </div>

            <form onSubmit={salvarAlteracoes}>
              {/* Foto de Perfil */}
              <div className="photo-upload-area">
                <img 
                  src={fotoPreview || usuarioPerfil?.avatar_url || '/img/711769.png'} 
                  alt="Preview" 
                  className="photo-preview" 
                />
                <div className="photo-actions">
                  <label htmlFor="photoInput" className="btn-primary">
                    <i className="fas fa-camera"></i> Escolher
                  </label>
                  <input 
                    type="file" 
                    id="photoInput" 
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={handleFotoChange}
                  />
                  <button type="button" className="btn-secondary" onClick={removerFoto}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="form-group">
                <label htmlFor="nome">Nome</label>
                <input 
                  type="text" 
                  id="nome" 
                  value={formData.nome}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Biografia</label>
                <textarea 
                  id="bio" 
                  rows="3"
                  value={formData.bio}
                  onChange={handleInputChange}
                ></textarea>
              </div>

              {/* LOCALIZAÇÃO */}
              <div className="form-section">
                <h3>Localização</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cidade">Cidade</label>
                    <input 
                      type="text" 
                      id="cidade" 
                      placeholder="Ex: São Paulo"
                      value={formData.cidade}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="estado">Estado</label>
                    <select id="estado" value={formData.estado} onChange={handleInputChange}>
                      <option value="">Selecione</option>
                      <option value="AC">Acre</option>
                      <option value="AL">Alagoas</option>
                      <option value="AP">Amapá</option>
                      <option value="AM">Amazonas</option>
                      <option value="BA">Bahia</option>
                      <option value="CE">Ceará</option>
                      <option value="DF">Distrito Federal</option>
                      <option value="ES">Espírito Santo</option>
                      <option value="GO">Goiás</option>
                      <option value="MA">Maranhão</option>
                      <option value="MT">Mato Grosso</option>
                      <option value="MS">Mato Grosso do Sul</option>
                      <option value="MG">Minas Gerais</option>
                      <option value="PA">Pará</option>
                      <option value="PB">Paraíba</option>
                      <option value="PR">Paraná</option>
                      <option value="PE">Pernambuco</option>
                      <option value="PI">Piauí</option>
                      <option value="RJ">Rio de Janeiro</option>
                      <option value="RN">Rio Grande do Norte</option>
                      <option value="RS">Rio Grande do Sul</option>
                      <option value="RO">Rondônia</option>
                      <option value="RR">Roraima</option>
                      <option value="SC">Santa Catarina</option>
                      <option value="SP">São Paulo</option>
                      <option value="SE">Sergipe</option>
                      <option value="TO">Tocantins</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="pais">País</label>
                  <input 
                    type="text" 
                    id="pais" 
                    value={formData.pais}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* DISPONIBILIDADE */}
              <div className="form-section">
                <h3>Disponibilidade</h3>
                <div className="form-group checkbox-group">
                  <label>
                    <input 
                      type="checkbox" 
                      id="disponivel" 
                      checked={formData.disponivel}
                      onChange={handleInputChange}
                    />
                    Disponível para projetos
                  </label>
                </div>
              </div>

              {/* LINKS */}
              <div className="form-section">
                <h3>Redes Sociais</h3>
                
                <div className="form-group">
                  <label htmlFor="github">GitHub</label>
                  <input 
                    type="url" 
                    id="github" 
                    placeholder="https://github.com/seu-usuario"
                    value={formData.github}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="linkedin">LinkedIn</label>
                  <input 
                    type="url" 
                    id="linkedin" 
                    placeholder="https://linkedin.com/in/seu-usuario"
                    value={formData.linkedin}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <button type="submit" className="btn-save" disabled={salvando}>
                <i className="fas fa-save"></i> {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfil;