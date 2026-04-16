import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import './PostarProjeto.css';

// Configuração do Supabase
const SUPABASE_URL = 'https://tgnwbxcygmjipupufoix.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbndieGN5Z21qaXB1cHVmb2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDI4NDcsImV4cCI6MjA4NzE3ODg0N30.78BjN7G0a0lnUwXmveggL0GQD-Xp-5C7QYUBmfOIt_s';

const PostarProjeto = () => {
  const navigate = useNavigate();
  
  // Estados
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [usuarioPerfil, setUsuarioPerfil] = useState(null);
  const [arquivosSelecionados, setArquivosSelecionados] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [links, setLinks] = useState([{ type: 'github', url: '' }]);
  const [colaboradores, setColaboradores] = useState([]);
  const [buscaResultados, setBuscaResultados] = useState([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria: '',
    orcamento: '',
    tecnologias: '',
    tags: '',
    status: 'em-andamento',
    visibilidade: 'publico'
  });

  // Referências
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

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
    if (usuarioLogado) {
      carregarPerfilUsuario();
    }
  }, [usuarioLogado]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target) &&
          resultsRef.current && !resultsRef.current.contains(e.target)) {
        setMostrarResultados(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ===== FUNÇÕES DE AUTENTICAÇÃO =====
  const carregarUsuarioLogado = async () => {
    try {
      const storedUser = localStorage.getItem('usuarioLogado');
      if (storedUser) {
        setUsuarioLogado(JSON.parse(storedUser));
      } else {
        navigate('/faca-login');
      }
    } catch (e) {
      console.error('Erro ao carregar usuário:', e);
      navigate('/faca-login');
    }
  };

  const carregarPerfilUsuario = async () => {
    if (!usuarioLogado) return;
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${usuarioLogado.id}&select=avatar_url`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (response.ok) {
        const perfis = await response.json();
        if (perfis.length > 0) {
          setUsuarioPerfil(perfis[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const getAuthHeaders = () => ({
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  });

  // ===== MANIPULAÇÃO DO FORMULÁRIO (CORRIGIDA) =====
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('Campo alterado:', name, 'Valor:', value); // Debug
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ===== LINKS =====
  const adicionarLink = () => {
    setLinks([...links, { type: 'github', url: '' }]);
  };

  const removerLink = (index) => {
    if (links.length > 1) {
      const novosLinks = links.filter((_, i) => i !== index);
      setLinks(novosLinks);
    } else {
      alert('Mantenha pelo menos um link ou limpe o campo se não quiser adicionar.');
    }
  };

  const atualizarLink = (index, campo, valor) => {
    const novosLinks = [...links];
    novosLinks[index][campo] = valor;
    setLinks(novosLinks);
  };

  // ===== UPLOAD DE MÍDIAS =====
  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    setArquivosSelecionados(files);
    
    const novosPreviews = [];
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          novosPreviews.push({ url: event.target.result, file });
          if (novosPreviews.length === files.length) {
            setPreviews(novosPreviews);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removerMedia = (index) => {
    const novosArquivos = arquivosSelecionados.filter((_, i) => i !== index);
    const novosPreviews = previews.filter((_, i) => i !== index);
    setArquivosSelecionados(novosArquivos);
    setPreviews(novosPreviews);
  };

  const fazerUploadMidias = async (arquivos, usuarioId) => {
    const urls = [];
    const bucketName = 'postagens';
    
    if (!arquivos || arquivos.length === 0) return [];
    
    for (let i = 0; i < arquivos.length; i++) {
      const arquivo = arquivos[i];
      
      try {
        if (arquivo.size > 10 * 1024 * 1024) {
          alert(`Arquivo "${arquivo.name}" é muito grande. Máximo 10MB.`);
          continue;
        }
        
        if (!arquivo.type.startsWith('image/')) {
          alert(`Arquivo "${arquivo.name}" não é uma imagem.`);
          continue;
        }
        
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const nomeLimpo = arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${usuarioId}/${timestamp}_${random}_${nomeLimpo}`;
        
        const formData = new FormData();
        formData.append('file', arquivo);
        
        const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${fileName}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: formData
        });

        if (uploadResponse.ok) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`;
          urls.push(publicUrl);
        } else {
          throw new Error('Falha no upload');
        }
        
      } catch (error) {
        console.error('Erro no upload:', error);
        throw error;
      }
    }
    
    return urls;
  };

  // ===== COLABORADORES =====
  const buscarUsuarios = useCallback(async (termo) => {
    if (termo.length < 3) {
      setBuscaResultados([]);
      setMostrarResultados(false);
      return;
    }
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?or=(nome.ilike.%25${termo}%25,email.ilike.%25${termo}%25)&limit=5`,
        { headers: getAuthHeaders() }
      );
      
      if (response.ok) {
        const usuarios = await response.json();
        
        const resultadosComAvatar = await Promise.all(
          usuarios
            .filter(u => !colaboradores.some(c => c.id === u.id))
            .map(async (usuario) => {
              const perfilResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${usuario.id}&select=avatar_url`,
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
                id: usuario.id,
                nome: usuario.nome || 'Usuário',
                email: usuario.email,
                avatar: avatarUrl
              };
            })
        );
        
        setBuscaResultados(resultadosComAvatar);
        setMostrarResultados(resultadosComAvatar.length > 0);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  }, [colaboradores]);

  const adicionarColaborador = (usuario) => {
    if (!colaboradores.some(c => c.id === usuario.id)) {
      setColaboradores([...colaboradores, usuario]);
    }
    setMostrarResultados(false);
    if (searchRef.current) {
      searchRef.current.value = '';
    }
  };

  const removerColaborador = (usuarioId) => {
    setColaboradores(colaboradores.filter(c => c.id !== usuarioId));
  };

  // ===== PUBLICAÇÃO =====
  const salvarProjeto = async (dados) => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/projetos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(dados)
    });

    if (!response.ok) {
      throw new Error('Erro ao salvar projeto');
    }

    return await response.json();
  };

  const salvarPostagem = async (dados) => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(dados)
    });

    if (!response.ok) {
      throw new Error('Erro ao criar postagem');
    }

    return await response.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!usuarioLogado) {
      alert('Você precisa estar logado!');
      navigate('/faca-login');
      return;
    }
    
    setLoading(true);
    
    try {
      if (!formData.titulo || !formData.descricao || !formData.categoria) {
        throw new Error('Preencha todos os campos obrigatórios');
      }
      
      let midiasUrls = [];
      if (arquivosSelecionados.length > 0) {
        midiasUrls = await fazerUploadMidias(arquivosSelecionados, usuarioLogado.id);
      }
      
      const linksValidos = links.filter(l => l.url.trim());
      const tecnologias = formData.tecnologias ? formData.tecnologias.split(',').map(t => t.trim()).filter(t => t) : [];
      const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [];
      
      const projetoData = {
        id_usuario: usuarioLogado.id,
        titulo: formData.titulo,
        descricao: formData.descricao,
        categoria: formData.categoria,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : null,
        tecnologias: tecnologias,
        tags: tags,
        links: linksValidos,
        status: formData.status,
        visibilidade: formData.visibilidade,
        midias: midiasUrls,
        colaboradores: colaboradores.map(c => c.id),
        curtidas: 0,
        comentarios: 0,
        visualizacoes: 0,
        data_criacao: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      };
      
      await salvarProjeto(projetoData);
      
      let conteudoPost = `🚀 **Novo Projeto: ${formData.titulo}**\n\n${formData.descricao.substring(0, 200)}${formData.descricao.length > 200 ? '...' : ''}`;
      
      if (tecnologias.length > 0) {
        conteudoPost += `\n\n📌 Tecnologias: ${tecnologias.join(', ')}`;
      }
      
      if (projetoData.orcamento) {
        conteudoPost += `\n💰 Orçamento: R$ ${parseFloat(projetoData.orcamento).toFixed(2)}`;
      }
      
      const postagemData = {
        id_usuario: usuarioLogado.id,
        conteudo: conteudoPost,
        orcamento: projetoData.orcamento,
        categoria: formData.categoria,
        midias: midiasUrls,
        curtidas: 0,
        comentarios: 0,
        compartilham: 0,
        data_postagem: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      };
      
      await salvarPostagem(postagemData);
      setShowModal(true);
      
    } catch (error) {
      console.error('Erro ao publicar projeto:', error);
      alert('Erro ao publicar projeto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    navigate('/aria-trabalho');
  };

  const handleModalToProfile = () => {
    setShowModal(false);
    navigate('/perfil');
  };

  // ===== RENDERIZAÇÃO =====
  if (!usuarioLogado) {
    return (
      <div className="postar-wrapper">
        <div className="postar-loading">
          <i className="fas fa-spinner fa-spin"></i> Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="postar-wrapper">
      {/* Navbar */}
      <nav className="postar-navbar">
        <div className="postar-nav-container">
          <div className="postar-nav-left">
            <a href="/aria-trabalho" className="postar-logo" onClick={(e) => { e.preventDefault(); navigate('/aria-trabalho'); }}>
              FreelanceHub
            </a>
          </div>
          <div className="postar-nav-right">
            <div className="postar-user-menu" onClick={() => navigate('/perfil')}>
              <img src={usuarioPerfil?.avatar_url || DEFAULT_AVATAR} alt="Avatar" className="postar-nav-avatar" />
              <span className="postar-nav-user-name">{usuarioLogado?.nome || 'Usuário'}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="postar-container">
        {/* Breadcrumb */}
        <div className="postar-breadcrumb">
          <a href="/aria-trabalho" onClick={(e) => { e.preventDefault(); navigate('/aria-trabalho'); }}>
            <i className="fas fa-home"></i> Feed
          </a>
          <i className="fas fa-chevron-right"></i>
          <span>Postar Projeto</span>
        </div>

        {/* Formulário */}
        <div className="postar-card">
          <div className="postar-card-header">
            <h2><i className="fas fa-rocket"></i> Criar Novo Projeto</h2>
          </div>

          <form className="postar-form" onSubmit={handleSubmit}>
            {/* Título */}
            <div className="postar-form-group">
              <label className="postar-label"><i className="fas fa-heading"></i> Título do Projeto <span className="postar-required">*</span></label>
              <input type="text" name="titulo" className="postar-form-control" placeholder="Ex: Desenvolvimento de E-commerce com React" maxLength="100" required value={formData.titulo} onChange={handleInputChange} />
              <div className="postar-char-counter">{formData.titulo.length}/100</div>
            </div>

            {/* Descrição */}
            <div className="postar-form-group">
              <label className="postar-label"><i className="fas fa-align-left"></i> Descrição do Projeto <span className="postar-required">*</span></label>
              <textarea name="descricao" className="postar-form-control" rows="6" placeholder="Descreva seu projeto em detalhes..." maxLength="2000" required value={formData.descricao} onChange={handleInputChange}></textarea>
              <div className="postar-char-counter">{formData.descricao.length}/2000</div>
            </div>

            {/* Categoria e Orçamento */}
            <div className="postar-form-row">
              <div className="postar-form-group-half">
                <label className="postar-label"><i className="fas fa-tag"></i> Categoria <span className="postar-required">*</span></label>
                <select name="categoria" className="postar-form-control" required value={formData.categoria} onChange={handleInputChange}>
                  <option value="">Selecione uma categoria</option>
                  <option value="web-development">Desenvolvimento Web</option>
                  <option value="mobile-development">Desenvolvimento Mobile</option>
                  <option value="design">Design & UX/UI</option>
                  <option value="backend">Backend & API</option>
                  <option value="frontend">Frontend</option>
                  <option value="fullstack">Full Stack</option>
                  <option value="devops">DevOps & Cloud</option>
                  <option value="database">Banco de Dados</option>
                  <option value="ai">IA & Machine Learning</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div className="postar-form-group-half">
                <label className="postar-label"><i className="fas fa-dollar-sign"></i> Orçamento Estimado</label>
                <div className="postar-budget-input">
                  <span className="postar-currency">R$</span>
                  <input type="number" name="orcamento" className="postar-form-control" placeholder="0,00" min="0" step="0.01" value={formData.orcamento} onChange={handleInputChange} />
                </div>
              </div>
            </div>

            {/* Tecnologias */}
            <div className="postar-form-group">
              <label className="postar-label"><i className="fas fa-code"></i> Tecnologias Utilizadas</label>
              <input type="text" name="tecnologias" className="postar-form-control" placeholder="Ex: React, Node.js, PostgreSQL, etc. (separadas por vírgula)" value={formData.tecnologias} onChange={handleInputChange} />
              <small className="postar-form-text">Separe as tecnologias por vírgula</small>
            </div>

            {/* Tags */}
            <div className="postar-form-group">
              <label className="postar-label"><i className="fas fa-hashtag"></i> Tags</label>
              <input type="text" name="tags" className="postar-form-control" placeholder="Ex: inovador, opensource, freelance (separadas por vírgula)" value={formData.tags} onChange={handleInputChange} />
              <small className="postar-form-text">Adicione tags para ajudar na busca</small>
            </div>

            {/* Links */}
            <div className="postar-form-group">
              <label className="postar-label"><i className="fas fa-link"></i> Links do Projeto</label>
              <div className="postar-link-input-group">
                {links.map((link, index) => (
                  <div key={index} className="postar-link-input-row">
                    <select className="postar-link-type" value={link.type} onChange={(e) => atualizarLink(index, 'type', e.target.value)}>
                      <option value="github">GitHub</option>
                      <option value="gitlab">GitLab</option>
                      <option value="bitbucket">Bitbucket</option>
                      <option value="demo">Demo Online</option>
                      <option value="documentation">Documentação</option>
                      <option value="other">Outro</option>
                    </select>
                    <input type="url" className="postar-link-url" placeholder="URL do projeto" value={link.url} onChange={(e) => atualizarLink(index, 'url', e.target.value)} />
                    <button type="button" className="postar-btn-remove-link" onClick={() => removerLink(index)}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="postar-btn-add-link" onClick={adicionarLink}>
                <i className="fas fa-plus"></i> Adicionar outro link
              </button>
            </div>

            {/* Imagens */}
            <div className="postar-form-group">
              <label className="postar-label"><i className="fas fa-images"></i> Imagens do Projeto</label>
              <div className="postar-media-upload-area">
                <input type="file" id="project-media" accept="image/*" multiple style={{ display: 'none' }} onChange={handleMediaChange} />
                <div className="postar-upload-placeholder" onClick={() => document.getElementById('project-media').click()}>
                  <i className="fas fa-cloud-upload-alt"></i>
                  <p>Clique para enviar imagens</p>
                  <span>PNG, JPG, GIF até 10MB</span>
                </div>
                <div className="postar-media-preview">
                  {previews.map((preview, index) => (
                    <div key={index} className="postar-preview-item">
                      <img src={preview.url} alt="Preview" />
                      <button type="button" className="postar-btn-remove-media" onClick={() => removerMedia(index)}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status e Visibilidade */}
            <div className="postar-form-row">
              <div className="postar-form-group-half">
                <label className="postar-label"><i className="fas fa-clock"></i> Status do Projeto</label>
                <select name="status" className="postar-form-control" value={formData.status} onChange={handleInputChange}>
                  <option value="em-andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="pausado">Pausado</option>
                  <option value="planejamento">Em Planejamento</option>
                </select>
              </div>

              <div className="postar-form-group-half">
                <label className="postar-label"><i className="fas fa-eye"></i> Visibilidade</label>
                <select name="visibilidade" className="postar-form-control" value={formData.visibilidade} onChange={handleInputChange}>
                  <option value="publico">Público</option>
                  <option value="privado">Privado</option>
                  <option value="seguidores">Apenas Seguidores</option>
                </select>
              </div>
            </div>

            {/* Colaboradores */}
            <div className="postar-form-group">
              <label className="postar-label"><i className="fas fa-users"></i> Colaboradores</label>
              <div className="postar-collaborators-container">
                <div className="postar-collaborator-search" ref={searchRef}>
                  <input type="text" placeholder="Buscar usuário por nome ou email" autoComplete="off" onChange={(e) => buscarUsuarios(e.target.value)} />
                  {mostrarResultados && buscaResultados.length > 0 && (
                    <div className="postar-search-results" ref={resultsRef} style={{ display: 'block' }}>
                      {buscaResultados.map(usuario => (
                        <div key={usuario.id} className="postar-search-result-item" onClick={() => adicionarColaborador(usuario)}>
                          <img src={usuario.avatar} alt="Avatar" />
                          <div>
                            <strong>{usuario.nome}</strong>
                            <br />
                            <small>{usuario.email}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="postar-collaborators-list">
                  {colaboradores.map(colab => (
                    <span key={colab.id} className="postar-collaborator-tag">
                      <img src={colab.avatar} alt="Avatar" />
                      {colab.nome}
                      <button className="postar-btn-remove-collaborator" onClick={() => removerColaborador(colab.id)}>
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <small className="postar-form-text">Adicione outros usuários como colaboradores do projeto</small>
            </div>

            {/* Botões */}
            <div className="postar-form-actions">
              <button type="button" className="postar-btn-cancel" onClick={() => navigate('/aria-trabalho')}>
                Cancelar
              </button>
              <button type="submit" className="postar-btn-submit" disabled={loading}>
                {loading ? (
                  <><i className="fas fa-spinner fa-spin"></i> Publicando...</>
                ) : (
                  <><i className="fas fa-rocket"></i> Publicar Projeto</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Sucesso */}
      {showModal && (
        <div className="postar-modal" style={{ display: 'flex' }}>
          <div className="postar-modal-content">
            <div className="postar-modal-icon postar-modal-icon-success">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Projeto Publicado com Sucesso!</h3>
            <p>Seu projeto foi compartilhado com a comunidade.</p>
            <div className="postar-modal-actions">
              <button className="postar-btn-primary" onClick={handleModalClose}>
                Ver no Feed
              </button>
              <button className="postar-btn-secondary" onClick={handleModalToProfile}>
                Ir para Perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostarProjeto;