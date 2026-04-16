import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/App3.css';

const AriaTrabalho = () => {
  const navigate = useNavigate();
  
  // ===== CONFIGURAÇÃO =====
  const SUPABASE_CONFIG = {
    URL: 'https://tgnwbxcygmjipupufoix.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbndieGN5Z21qaXB1cHVmb2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDI4NDcsImV4cCI6MjA4NzE3ODg0N30.78BjN7G0a0lnUwXmveggL0GQD-Xp-5C7QYUBmfOIt_s'
  };

  // ===== CONSTANTES =====
  const DEFAULT_AVATAR = '/img/711769.png';
  const BUCKET_NAME = 'postagens';

  // ===== ESTADOS =====
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [usuarioPerfil, setUsuarioPerfil] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [categoria, setCategoria] = useState('');
  const [arquivosSelecionados, setArquivosSelecionados] = useState([]);
  const [postsCurtidos, setPostsCurtidos] = useState(new Set());
  const [comentariosCurtidos, setComentariosCurtidos] = useState(new Set());
  const [respostasCurtidas, setRespostasCurtidas] = useState(new Set());
  const [comentarioAtual, setComentarioAtual] = useState({});
  const [respostaAtual, setRespostaAtual] = useState({});
  const [postComentariosAbertos, setPostComentariosAbertos] = useState({});
  const [isLoadingComentarios, setIsLoadingComentarios] = useState({});
  const [cachePerfis] = useState(new Map());
  const [cacheUsuarios] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [imagemModal, setImagemModal] = useState('');
  const [videoModal, setVideoModal] = useState(false);
  
  // ===== REFS =====
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const previewRef = useRef(null);
  const feedContainerRef = useRef(null);
  const modalRef = useRef(null);

  // ===== UTILS =====
  const debugLog = (mensagem, dados = null) => {
    if (process.env.NODE_ENV === 'development') {
      if (dados && typeof dados === 'object') {
        const dadosSeguros = { ...dados };
        const camposSensiveis = ['senha', 'email', 'access_token', 'refresh_token', 'token'];
        camposSensiveis.forEach(campo => {
          if (dadosSeguros[campo]) dadosSeguros[campo] = '[OCULTO]';
        });
        console.log(`🔍 [DEBUG] ${mensagem}`, dadosSeguros);
      } else {
        console.log(`🔍 [DEBUG] ${mensagem}`, dados || '');
      }
    }
  };

  const getAuthHeaders = (includeContentType = true) => {
    const headers = { 'apikey': SUPABASE_CONFIG.ANON_KEY };
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
  };

  const calcularTempoRelativo = (data) => {
    if (!data) return 'agora mesmo';
    const diffMin = Math.floor((new Date() - new Date(data)) / 60000);
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffMin < 1440) return `há ${Math.floor(diffMin / 60)} h`;
    if (diffMin < 43200) return `há ${Math.floor(diffMin / 1440)} d`;
    return `há ${Math.floor(diffMin / 43200)} meses`;
  };

  const ordenarPorDataRecente = (a, b) => {
    return new Date(b.data_comentario || b.data_resposta) - new Date(a.data_comentario || a.data_resposta);
  };

  // ===== NAVEGAÇÃO =====
  const redirecionarParaPerfil = (userId) => {
    if (!usuarioLogado) {
      navigate('/faca-login');
      return;
    }
    if (String(userId) === String(usuarioLogado.id)) {
      navigate('/perfil');
    } else {
      navigate(`/perfil/usuario?id=${userId}`);
    }
  };

  // ===== MODAL =====
  const abrirModal = (url, tipo) => {
    setImagemModal(url);
    setVideoModal(tipo === 'video');
    setModalAberto(true);
    document.body.style.overflow = 'hidden';
  };

  const fecharModal = () => {
    setModalAberto(false);
    setImagemModal('');
    setVideoModal(false);
    document.body.style.overflow = 'auto';
  };

  // ===== CACHE =====
  const getNomeUsuario = useCallback(async (userId) => {
    if (!userId) return 'Usuário';
    if (cacheUsuarios.has(userId)) return cacheUsuarios.get(userId);
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/usuarios?id=eq.${userId}&select=nome`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const usuarios = await response.json();
        const nome = usuarios[0]?.nome || 'Usuário';
        cacheUsuarios.set(userId, nome);
        return nome;
      }
    } catch (error) {
      console.error('Erro ao carregar nome:', error);
    }
    return 'Usuário';
  }, [cacheUsuarios]);

  const getFotoPerfilUsuario = useCallback(async (userId) => {
    if (!userId) return DEFAULT_AVATAR;
    if (cachePerfis.has(userId)) return cachePerfis.get(userId);
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/perfil?id_usuarios=eq.${userId}&select=avatar_url`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const perfis = await response.json();
        const foto = perfis[0]?.avatar_url || DEFAULT_AVATAR;
        cachePerfis.set(userId, foto);
        return foto;
      }
    } catch (error) {
      console.error('Erro ao carregar foto:', error);
    }
    return DEFAULT_AVATAR;
  }, [cachePerfis]);

  // ===== CARREGAMENTO INICIAL =====
  const carregarUsuarioLogado = async () => {
    debugLog('Carregando usuário do localStorage...');
    try {
      const storedUser = localStorage.getItem('usuarioLogado');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUsuarioLogado(user);
        debugLog('Usuário encontrado', { 
          id: user.id, 
          nome: user.nome,
          // dados sensíveis removidos
        });
      } else {
        setUsuarioLogado(null);
        debugLog('Nenhum usuário no localStorage');
      }
    } catch (e) {
      console.error('Erro ao parsear usuário:', e);
      setUsuarioLogado(null);
    }
  };

  const carregarPerfilUsuario = async () => {
    if (!usuarioLogado) return;
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/perfil?id_usuarios=eq.${usuarioLogado.id}`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const perfis = await response.json();
        if (perfis[0]) setUsuarioPerfil(perfis[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const carregarCurtidas = async () => {
    if (!usuarioLogado) return;
    try {
      const postsResponse = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/curtidas?select=id_post&id_usuario=eq.${usuarioLogado.id}`,
        { headers: getAuthHeaders() }
      );
      if (postsResponse.ok) {
        const curtidas = await postsResponse.json();
        setPostsCurtidos(new Set(curtidas.map(c => String(c.id_post))));
      }
      const comentariosResponse = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/curtidas_comentarios?select=id_comentario&id_usuario=eq.${usuarioLogado.id}`,
        { headers: getAuthHeaders() }
      );
      if (comentariosResponse.ok) {
        const curtidas = await comentariosResponse.json();
        setComentariosCurtidos(new Set(curtidas.map(c => String(c.id_comentario))));
      }
      const respostasResponse = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/curtidas_respostas?select=id_resposta&id_usuario=eq.${usuarioLogado.id}`,
        { headers: getAuthHeaders() }
      );
      if (respostasResponse.ok) {
        const curtidas = await respostasResponse.json();
        setRespostasCurtidas(new Set(curtidas.map(c => String(c.id_resposta))));
      }
    } catch (e) {
      console.error('Erro ao carregar curtidas:', e);
    }
  };

  // ===== POSTAGENS =====
  const carregarPostagens = async () => {
    try {
      debugLog('Carregando postagens...');
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/posts?order=data_postagem.desc`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) {
        console.error('Erro:', await response.text());
        return;
      }
      const postagens = await response.json();
      const postsEnriquecidos = await Promise.all(
        postagens.map(async (post) => ({
          ...post,
          nome_usuario: await getNomeUsuario(post.id_usuario),
          foto_perfil: await getFotoPerfilUsuario(post.id_usuario),
          comentariosList: []
        }))
      );
      debugLog(`${postsEnriquecidos.length} posts carregados`);
      setPosts(postsEnriquecidos);
    } catch (error) {
      console.error('Erro ao carregar postagens:', error);
    }
  };

  const fazerUploadMidias = async (arquivos, usuarioId) => {
    const urls = [];
    for (const arquivo of arquivos) {
      try {
        if (arquivo.size > 10 * 1024 * 1024) {
          throw new Error(`Arquivo muito grande: Máx 10MB`);
        }
        const fileName = `${usuarioId}/${Date.now()}_${arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const formData = new FormData();
        formData.append('file', arquivo);
        const uploadResponse = await fetch(
          `${SUPABASE_CONFIG.URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_CONFIG.ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
            },
            body: formData
          }
        );
        if (uploadResponse.ok) {
          urls.push(`${SUPABASE_CONFIG.URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`);
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

  const publicarPostagem = async () => {
    if (!usuarioLogado) {
      alert('Você precisa estar logado para publicar!');
      return navigate('/faca-login');
    }
    if (!postText.trim() && arquivosSelecionados.length === 0) {
      alert('Digite algo ou selecione uma mídia para publicar!');
      return;
    }
    setIsLoading(true);
    try {
      let midiasUrls = [];
      if (arquivosSelecionados.length > 0) {
        midiasUrls = await fazerUploadMidias(arquivosSelecionados, usuarioLogado.id);
      }
      const postagemData = {
        id_usuario: usuarioLogado.id,
        conteudo: postText,
        orcamento: orcamento ? parseFloat(orcamento) : null,
        categoria: categoria || null,
        midias: midiasUrls,
        curtidas: 0,
        comentarios: 0,
        compartilham: 0,
        data_postagem: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      };
      const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/posts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(postagemData)
      });
      if (!response.ok) throw new Error('Erro ao salvar postagem');
      setPostText('');
      setArquivosSelecionados([]);
      setOrcamento('');
      setCategoria('');
      if (previewRef.current) {
        previewRef.current.innerHTML = '';
        previewRef.current.style.display = 'none';
      }
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      await carregarPostagens();
    } catch (error) {
      console.error('Erro ao publicar:', error);
      alert('Erro ao publicar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== CURTIDAS =====
  const toggleCurtida = async (postId) => {
    if (!usuarioLogado) {
      alert('Você precisa estar logado para curtir!');
      return;
    }
    try {
      const estavaCurtido = postsCurtidos.has(String(postId));
      setPostsCurtidos(prev => {
        const novo = new Set(prev);
        estavaCurtido ? novo.delete(String(postId)) : novo.add(String(postId));
        return novo;
      });
      setPosts(prev => prev.map(post => 
        post.id === postId
          ? { ...post, curtidas: Math.max(0, (post.curtidas || 0) + (estavaCurtido ? -1 : 1)) }
          : post
      ));
      const postAtual = posts.find(p => p.id === postId);
      const novasCurtidas = Math.max(0, (postAtual?.curtidas || 0) + (estavaCurtido ? -1 : 1));
      await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/posts?id=eq.${postId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ curtidas: novasCurtidas })
      });
      if (estavaCurtido) {
        await fetch(
          `${SUPABASE_CONFIG.URL}/rest/v1/curtidas?id_usuario=eq.${usuarioLogado.id}&id_post=eq.${postId}`,
          { method: 'DELETE', headers: getAuthHeaders() }
        );
      } else {
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/curtidas`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id_usuario: usuarioLogado.id,
            id_post: parseInt(postId),
            data_curtida: new Date().toISOString()
          })
        });
      }
    } catch (error) {
      console.error('Erro ao curtir:', error);
    }
  };

  const curtirComentario = async (comentarioId, postId) => {
    if (!usuarioLogado) {
      alert('Você precisa estar logado para curtir!');
      return;
    }
    try {
      const estavaCurtido = comentariosCurtidos.has(String(comentarioId));
      setComentariosCurtidos(prev => {
        const novo = new Set(prev);
        estavaCurtido ? novo.delete(String(comentarioId)) : novo.add(String(comentarioId));
        return novo;
      });
      setPosts(prev => prev.map(post => 
        post.id === postId && post.comentariosList
          ? {
              ...post,
              comentariosList: post.comentariosList.map(c =>
                c.id === comentarioId
                  ? { ...c, curtidas: Math.max(0, (c.curtidas || 0) + (estavaCurtido ? -1 : 1)) }
                  : c
              )
            }
          : post
      ));
      const comentario = posts.find(p => p.id === postId)?.comentariosList?.find(c => c.id === comentarioId);
      const novasCurtidas = Math.max(0, (comentario?.curtidas || 0) + (estavaCurtido ? -1 : 1));
      await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/comentarios?id=eq.${comentarioId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ curtidas: novasCurtidas })
      });
      if (estavaCurtido) {
        await fetch(
          `${SUPABASE_CONFIG.URL}/rest/v1/curtidas_comentarios?id_usuario=eq.${usuarioLogado.id}&id_comentario=eq.${comentarioId}`,
          { method: 'DELETE', headers: getAuthHeaders() }
        );
      } else {
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/curtidas_comentarios`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id_usuario: usuarioLogado.id,
            id_comentario: parseInt(comentarioId),
            data_curtida: new Date().toISOString()
          })
        });
      }
    } catch (e) {
      console.error('Erro ao curtir comentário:', e);
    }
  };

  const curtirResposta = async (respostaId, postId, comentarioId) => {
    if (!usuarioLogado) {
      alert('Você precisa estar logado para curtir!');
      return;
    }
    try {
      const estavaCurtido = respostasCurtidas.has(String(respostaId));
      setRespostasCurtidas(prev => {
        const novo = new Set(prev);
        estavaCurtido ? novo.delete(String(respostaId)) : novo.add(String(respostaId));
        return novo;
      });
      setPosts(prev => prev.map(post => 
        post.id === postId && post.comentariosList
          ? {
              ...post,
              comentariosList: post.comentariosList.map(c =>
                c.id === comentarioId && c.respostas
                  ? {
                      ...c,
                      respostas: c.respostas.map(r =>
                        r.id === respostaId
                          ? { ...r, curtidas: Math.max(0, (r.curtidas || 0) + (estavaCurtido ? -1 : 1)) }
                          : r
                      )
                    }
                  : c
              )
            }
          : post
      ));
      const resposta = posts.find(p => p.id === postId)
        ?.comentariosList?.find(c => c.id === comentarioId)
        ?.respostas?.find(r => r.id === respostaId);
      const novasCurtidas = Math.max(0, (resposta?.curtidas || 0) + (estavaCurtido ? -1 : 1));
      await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/respostas_comentarios?id=eq.${respostaId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ curtidas: novasCurtidas })
      });
      if (estavaCurtido) {
        await fetch(
          `${SUPABASE_CONFIG.URL}/rest/v1/curtidas_respostas?id_usuario=eq.${usuarioLogado.id}&id_resposta=eq.${respostaId}`,
          { method: 'DELETE', headers: getAuthHeaders() }
        );
      } else {
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/curtidas_respostas`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id_usuario: usuarioLogado.id,
            id_resposta: parseInt(respostaId),
            data_curtida: new Date().toISOString()
          })
        });
      }
    } catch (e) {
      console.error('Erro ao curtir resposta:', e);
    }
  };

  // ===== COMENTÁRIOS =====
  const carregarComentarios = async (postId) => {
    if (!postId) return;
    setIsLoadingComentarios(prev => ({ ...prev, [postId]: true }));
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/comentarios?id_post=eq.${postId}&order=data_comentario.desc`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Erro ao carregar comentários');
      const comentarios = await response.json();
      if (comentarios.length === 0) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comentariosList: [] } : p));
        return;
      }
      const comentariosComRespostas = await Promise.all(
        comentarios.map(async (comentario) => {
          const respostasResponse = await fetch(
            `${SUPABASE_CONFIG.URL}/rest/v1/respostas_comentarios?id_comentario=eq.${comentario.id}&order=data_resposta.desc`,
            { headers: getAuthHeaders() }
          );
          let respostas = respostasResponse.ok ? await respostasResponse.json() : [];
          respostas = respostas.sort(ordenarPorDataRecente);
          const respostasEnriquecidas = await Promise.all(
            respostas.map(async (resposta) => ({
              ...resposta,
              nome_usuario: await getNomeUsuario(resposta.id_usuario),
              foto_perfil: await getFotoPerfilUsuario(resposta.id_usuario)
            }))
          );
          return {
            ...comentario,
            nome_usuario: await getNomeUsuario(comentario.id_usuario),
            foto_perfil: await getFotoPerfilUsuario(comentario.id_usuario),
            respostas: respostasEnriquecidas,
            mostrarRespostas: false
          };
        })
      );
      const comentariosOrdenados = comentariosComRespostas.sort(ordenarPorDataRecente);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comentariosList: comentariosOrdenados } : p));
    } catch (e) {
      console.error('❌ Erro ao carregar comentários:', e);
    } finally {
      setIsLoadingComentarios(prev => ({ ...prev, [postId]: false }));
    }
  };

  const adicionarComentario = async (postId) => {
    if (!usuarioLogado) {
      alert('Faça login para comentar!');
      return;
    }
    const comentarioTexto = comentarioAtual[postId];
    if (!comentarioTexto?.trim()) {
      alert('Digite um comentário!');
      return;
    }
    try {
      const headers = getAuthHeaders();
      const dados = {
        id_post: parseInt(postId),
        id_usuario: parseInt(usuarioLogado.id),
        conteudo: comentarioTexto.trim(),
        curtidas: 0,
        data_comentario: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      };
      const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/comentarios`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(dados)
      });
      if (!response.ok) throw new Error('Erro ao adicionar comentário');
      setComentarioAtual(prev => ({ ...prev, [postId]: '' }));
      await carregarComentarios(postId);
      await atualizarContadorComentarios(postId);
    } catch (e) {
      console.error('❌ Erro ao adicionar comentário:', e);
      alert('Erro ao adicionar comentário.');
    }
  };

  const adicionarResposta = async (comentarioId, postId) => {
    if (!usuarioLogado) {
      alert('Faça login para responder!');
      return;
    }
    const texto = respostaAtual[comentarioId];
    if (!texto?.trim()) {
      alert('Digite uma resposta!');
      return;
    }
    try {
      const headers = getAuthHeaders();
      const dados = {
        id_comentario: parseInt(comentarioId),
        id_usuario: parseInt(usuarioLogado.id),
        conteudo: texto.trim(),
        curtidas: 0,
        data_resposta: new Date().toISOString()
      };
      const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/respostas_comentarios`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(dados)
      });
      if (!response.ok) throw new Error('Erro ao adicionar resposta');
      setRespostaAtual(prev => ({ ...prev, [comentarioId]: '' }));
      await carregarComentarios(postId);
    } catch (e) {
      console.error('❌ Erro ao adicionar resposta:', e);
      alert('Erro ao adicionar resposta.');
    }
  };

  const atualizarContadorComentarios = async (postId) => {
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/comentarios?select=id&id_post=eq.${postId}`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        const total = data.length || 0;
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/posts?id=eq.${postId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ comentarios: total })
        });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comentarios: total } : p));
      }
    } catch (e) {
      console.error('Erro ao atualizar contador:', e);
    }
  };

  const toggleComentarios = async (postId) => {
    const novoEstado = !postComentariosAbertos[postId];
    setPostComentariosAbertos(prev => ({ ...prev, [postId]: novoEstado }));
    if (novoEstado) {
      const post = posts.find(p => p.id === postId);
      if (!post?.comentariosList || post.comentariosList.length === 0) {
        await carregarComentarios(postId);
      }
    }
  };

  const toggleRespostas = (postId, comentarioId) => {
    setPosts(prev => prev.map(p => 
      p.id === postId && p.comentariosList
        ? {
            ...p,
            comentariosList: p.comentariosList.map(c =>
              c.id === comentarioId
                ? { ...c, mostrarRespostas: !c.mostrarRespostas }
                : c
            )
          }
        : p
    ));
  };

  // ===== UPLOAD =====
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setArquivosSelecionados(prev => [...prev, ...files]);
    mostrarPreviews([...arquivosSelecionados, ...files]);
  };

  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files);
    setArquivosSelecionados(prev => [...prev, ...files]);
    mostrarPreviews([...arquivosSelecionados, ...files]);
  };

 const mostrarPreviews = (arquivos) => {
  const container = previewRef.current;
  if (!container) return;
  
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.gap = '12px';
  container.style.flexWrap = 'wrap';
  container.style.alignItems = 'flex-start';

  arquivos.forEach((arquivo, index) => {
    const url = URL.createObjectURL(arquivo);
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    
    const imageContainer = document.createElement('div');
    imageContainer.style.width = '70px';
    imageContainer.style.height = '70px';
    imageContainer.style.borderRadius = '8px';
    imageContainer.style.overflow = 'hidden';
    imageContainer.style.border = '2px solid #e0e0e0';
    imageContainer.style.backgroundColor = '#f5f5f5';

    if (arquivo.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = url;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      imageContainer.appendChild(img);
    } else if (arquivo.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = url;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      imageContainer.appendChild(video);
    }
    
    wrapper.appendChild(imageContainer);
    
    const btnRemover = document.createElement('button');
    btnRemover.innerHTML = '×';
    btnRemover.style.position = 'absolute';
    btnRemover.style.top = '-6px';
    btnRemover.style.right = '-6px';
    btnRemover.style.width = '20px';
    btnRemover.style.height = '20px';
    btnRemover.style.background = '#f44336';
    btnRemover.style.color = 'white';
    btnRemover.style.border = 'none';
    btnRemover.style.borderRadius = '50%';
    btnRemover.style.cursor = 'pointer';
    btnRemover.style.display = 'flex';
    btnRemover.style.alignItems = 'center';
    btnRemover.style.justifyContent = 'center';
    btnRemover.style.fontSize = '12px';
    btnRemover.style.fontWeight = 'bold';
    btnRemover.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
    btnRemover.style.zIndex = '10';
    
    btnRemover.onclick = () => {
      const novosArquivos = arquivosSelecionados.filter((_, i) => i !== index);
      setArquivosSelecionados(novosArquivos);
      mostrarPreviews(novosArquivos);
    };
    
    wrapper.appendChild(btnRemover);
    container.appendChild(wrapper);
  });
};

  // ===== RENDERIZAÇÃO =====
  const renderMidias = (midias) => {
    if (!midias?.length) return null;
    return (
      <div style={{ margin: '15px 0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {midias.map((url, index) => {
          const imageUrl = url.startsWith('http') ? url : `${SUPABASE_CONFIG.URL}/storage/v1/object/public/${url}`;
          const isVideo = /\.(mp4|webm|ogg|mov)/i.test(imageUrl);
          return isVideo ? (
            <div key={index} style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
              <video controls style={{ width: '100%', maxHeight: '500px' }} src={imageUrl} />
            </div>
          ) : (
            <div key={index} style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => abrirModal(imageUrl, 'image')}>
              <img src={imageUrl} style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }} alt="Mídia do post" />
            </div>
          );
        })}
      </div>
    );
  };

  const renderTags = (post) => (
    <div style={{ display: 'flex', gap: '10px', margin: '15px 0', flexWrap: 'wrap' }}>
      {post.orcamento && (
        <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500' }}>
          💰 R$ {parseFloat(post.orcamento).toFixed(2)}
        </span>
      )}
      {post.categoria && (
        <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500' }}>
          #{post.categoria}
        </span>
      )}
    </div>
  );

  const renderComentarios = (post) => {
    if (!post.comentariosList || post.comentariosList.length === 0) {
      return (
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#666', padding: '20px' }}>
          Nenhum comentário ainda. Seja o primeiro a comentar!
        </div>
      );
    }
    return (
      <div className="comentarios-section" style={{ marginTop: '20px' }}>
        {post.comentariosList.map(comentario => (
          <div key={comentario.id} className="comentario-item">
            <div style={{ display: 'flex', gap: '12px' }}>
              <img 
                src={comentario.foto_perfil || DEFAULT_AVATAR} 
                alt="Avatar" 
                className="comentario-avatar"
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => redirecionarParaPerfil(comentario.id_usuario)}
              />
              <div style={{ flex: 1 }}>
                <div className="comentario-conteudo">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <a href="#" onClick={(e) => { e.preventDefault(); redirecionarParaPerfil(comentario.id_usuario); }} style={{ textDecoration: 'none', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                      {comentario.nome_usuario || 'Usuário'}
                    </a>
                    <span style={{ fontSize: '11px', color: '#666' }}>
                      {calcularTempoRelativo(comentario.data_comentario)}
                    </span>
                  </div>
                  <p className="comentario-texto">{comentario.conteudo}</p>
                </div>
                <div className="comentario-acoes">
                  <button className="comentario-btn" onClick={() => curtirComentario(comentario.id, post.id)} style={{ color: comentariosCurtidos.has(String(comentario.id)) ? '#e74c3c' : '#666' }}>
                    <i className={comentariosCurtidos.has(String(comentario.id)) ? 'fas fa-heart' : 'far fa-heart'}></i>
                    <span>{comentario.curtidas || 0}</span>
                  </button>
                  <button className="comentario-btn" onClick={() => toggleRespostas(post.id, comentario.id)} style={{ color: '#666' }}>
                    <i className="far fa-comment"></i> Responder
                  </button>
                </div>
                {comentario.mostrarRespostas && (
                  <div style={{ marginLeft: '20px', marginTop: '15px' }}>
                    {comentario.respostas?.map(resposta => (
                      <div key={resposta.id} className="resposta-item">
                        <img src={resposta.foto_perfil || DEFAULT_AVATAR} alt="Avatar" className="resposta-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => redirecionarParaPerfil(resposta.id_usuario)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <a href="#" onClick={(e) => { e.preventDefault(); redirecionarParaPerfil(resposta.id_usuario); }} style={{ textDecoration: 'none', color: '#333', fontWeight: '600', fontSize: '13px' }}>
                                {resposta.nome_usuario || 'Usuário'}
                              </a>
                              <span style={{ fontSize: '10px', color: '#666' }}>
                                {calcularTempoRelativo(resposta.data_resposta)}
                              </span>
                            </div>
                            <p className="resposta-texto">{resposta.conteudo}</p>
                          </div>
                          <button onClick={() => curtirResposta(resposta.id, post.id, comentario.id)} style={{ background: 'none', border: 'none', color: respostasCurtidas.has(String(resposta.id)) ? '#e74c3c' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', marginTop: '4px', marginLeft: '8px' }}>
                            <i className={respostasCurtidas.has(String(resposta.id)) ? 'fas fa-heart' : 'far fa-heart'}></i>
                            <span>{resposta.curtidas || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="resposta-area">
                      <img src={usuarioPerfil?.avatar_url || DEFAULT_AVATAR} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <textarea className="resposta-textarea" value={respostaAtual[comentario.id] || ''} onChange={(e) => setRespostaAtual(prev => ({ ...prev, [comentario.id]: e.target.value }))} placeholder="Escreva uma resposta..." />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button onClick={() => adicionarResposta(comentario.id, post.id)} style={{ background: '#0a66c2', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>Responder</button>
                          <button onClick={() => setRespostaAtual(prev => ({ ...prev, [comentario.id]: '' }))} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>Cancelar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ===== EFFECTS =====
  useEffect(() => {
    carregarUsuarioLogado();
  }, []);

  useEffect(() => {
    if (usuarioLogado) {
      carregarPerfilUsuario();
      carregarCurtidas();
    }
    carregarPostagens();
  }, [usuarioLogado]);

  useEffect(() => {
    const interval = setInterval(() => setPosts(prev => [...prev]), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      debugLog('Posts atualizados', {
        total: posts.length,
        comComentarios: posts.filter(p => p.comentariosList?.length > 0).length
      });
    }
  }, [posts]);

  // ===== RENDER =====
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && fecharModal();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="topbar-container">
          <h1>
            <a href="/aria-trabalho" style={{ textDecoration: 'none', color: 'inherit' }}>
              Freelance<span>Hub</span>
            </a>
          </h1>
          <div className="topbar-user" onClick={() => redirecionarParaPerfil(usuarioLogado?.id)} style={{ cursor: 'pointer' }}>
            <img src={usuarioPerfil?.avatar_url || DEFAULT_AVATAR} alt="Perfil" className="topbar-avatar" />
            <span>{usuarioLogado?.nome || 'Perfil'}</span>
          </div>
        </div>
      </header>

      <main className="layout">
        {/* Sidebar Esquerda */}
        <aside className="leftbar sidebar">
          <div className="profile-card">
            <div className="profile-header" onClick={() => redirecionarParaPerfil(usuarioLogado?.id)} style={{ cursor: 'pointer' }}>
              <img src={usuarioPerfil?.avatar_url || DEFAULT_AVATAR} alt="Perfil" className="profile-avatar" />
              <div className="profile-info">
                <h3>{usuarioLogado?.nome || 'Usuário'}</h3>
                <div className="profile-stats"></div>
              </div>
            </div>

            <button className="btn-primary" onClick={() => navigate('/postar-projeto')}>
              <i className="fas fa-plus-circle"></i> Postar Projeto
            </button>
            
            <ul className="menu">
              <li className="menu-item">
                <a href="/aria-trabalho" className="menu-link active">
                  <i className="fas fa-home"></i> Feed
                </a>
              </li>
              <li className="menu-item">
                <a href="/mensagens" className="menu-link">
                  <i className="fas fa-envelope"></i> Mensagens
                </a>
              </li>
              <li className="menu-item">
                <a href="/notificacoes" className="menu-link">
                  <i className="fas fa-bell"></i> Notificações
                  <span className="badge">0</span>
                </a>
              </li>
              <li className="menu-item">
                <a href="/fazer-pedidos" className="menu-link">
                  <i className="fas fa-user-friends"></i> Fazer Pedidos
                  <span className="badge">0</span>
                </a>
              </li>
            </ul>
          </div>
        </aside>

        {/* Feed Central */}
        <section className="feed-container" ref={feedContainerRef}>
          {usuarioLogado && (
            <div className="new-post-card">
              <div className="post-header">
                <img src={usuarioPerfil?.avatar_url || DEFAULT_AVATAR} alt="Perfil" className="post-author-avatar" onClick={() => redirecionarParaPerfil(usuarioLogado?.id)} style={{ cursor: 'pointer' }} />
                <div className="post-author-info">
                  <h4 onClick={() => redirecionarParaPerfil(usuarioLogado?.id)} style={{ cursor: 'pointer' }}>{usuarioLogado?.nome || 'Usuário'}</h4>
                  <p>Full Stack Developer</p>
                </div>
              </div>

              <textarea id="postText" value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Descreva seu projeto freelance... Exemplo: 'Preciso de um desenvolvedor para criar um site responsivo em React.'" />

              <div className="post-actions">
                <div className="action-group">
                  <label htmlFor="imageInput" className="upload-btn"><i className="fas fa-image"></i> Foto</label>
                  <input type="file" id="imageInput" accept="image/*" multiple hidden ref={imageInputRef} onChange={handleImageChange} />
                  <label htmlFor="videoInput" className="upload-btn"><i className="fas fa-video"></i> Vídeo</label>
                  <input type="file" id="videoInput" accept="video/*" multiple hidden ref={videoInputRef} onChange={handleVideoChange} />
                </div>

                <div className="post-settings">
                  <select className="budget-select" value={orcamento} onChange={(e) => setOrcamento(e.target.value)}>
                    <option value="">Orçamento</option>
                    <option value="500">R$ 500+</option>
                    <option value="1000">R$ 1.000+</option>
                    <option value="2000">R$ 2.000+</option>
                  </select>
                  <select className="category-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    <option value="">Categoria</option>
                    <option value="web">Desenvolvimento Web</option>
                    <option value="mobile">Mobile</option>
                    <option value="design">Design</option>
                  </select>
                  <button className="btn-postar" onClick={publicarPostagem} disabled={isLoading}>
                    {isLoading ? <><i className="fas fa-spinner fa-spin"></i> Publicando...</> : <><i className="fas fa-paper-plane"></i> Publicar</>}
                  </button>
                </div>
              </div>

              <div className="image-preview-container" ref={previewRef} style={{ display: arquivosSelecionados.length ? 'flex' : 'none' }} />
            </div>
          )}

          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <i className="fas fa-newspaper" style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }} />
              <h3>Nenhuma postagem ainda</h3>
              <p>Seja o primeiro a compartilhar algo!</p>
            </div>
          ) : (
            posts.map(post => {
              const jaCurtido = postsCurtidos.has(String(post.id));
              const comentariosAbertos = postComentariosAbertos[post.id];
              const carregandoComentarios = isLoadingComentarios[post.id];
              
              return (
                <div key={post.id} className="post-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                    <img src={post.foto_perfil || DEFAULT_AVATAR} alt="Perfil" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e0e0e0', cursor: 'pointer' }} onClick={() => redirecionarParaPerfil(post.id_usuario)} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); redirecionarParaPerfil(post.id_usuario); }} style={{ textDecoration: 'none', color: '#333' }}>
                          {post.nome_usuario}
                        </a>
                      </h4>
                      <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
                        {calcularTempoRelativo(post.data_postagem)}
                      </p>
                    </div>
                  </div>

                  {post.conteudo && (
                    <div style={{ marginBottom: '15px' }}>
                      <p style={{ margin: 0, lineHeight: '1.6', color: '#333', fontSize: '15px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {post.conteudo}
                      </p>
                    </div>
                  )}

                  {renderMidias(post.midias)}
                  {renderTags(post)}

                  <div className="post-actions-mobile" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                    <button onClick={() => toggleCurtida(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: jaCurtido ? '#e74c3c' : '#666', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <i className={jaCurtido ? 'fas fa-heart' : 'far fa-heart'} style={{ fontSize: '18px' }} />
                      <span>{post.curtidas || 0}</span>
                    </button>

                    <button onClick={() => toggleComentarios(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: comentariosAbertos ? '#0a66c2' : '#666', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <i className="far fa-comment" style={{ fontSize: '18px' }} />
                      <span>{post.comentarios || 0}</span>
                    </button>

                    <button onClick={() => { if (navigator.share) { navigator.share({ title: 'Compartilhar post', text: post.conteudo, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); alert('Link copiado para a área de transferência!'); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <i className="fas fa-share-alt" style={{ fontSize: '18px' }} />
                      <span>{post.compartilham || 0}</span>
                    </button>
                  </div>

                  {comentariosAbertos && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                      {usuarioLogado ? (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                          <img src={usuarioPerfil?.avatar_url || DEFAULT_AVATAR} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div style={{ flex: 1 }}>
                            <textarea value={comentarioAtual[post.id] || ''} onChange={(e) => setComentarioAtual(prev => ({ ...prev, [post.id]: e.target.value }))} placeholder="Adicione um comentário..." style={{ width: '100%', padding: '12px', borderRadius: '20px', border: '1px solid #dee2e6', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                              <button onClick={() => adicionarComentario(post.id)} style={{ background: '#0a66c2', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600' }}>Comentar</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                          <p style={{ margin: 0 }}>Faça <a href="/faca-login" style={{ color: '#0a66c2' }}>login</a> para comentar</p>
                        </div>
                      )}

                      {carregandoComentarios && (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#0a66c2' }} />
                          <p>Carregando comentários...</p>
                        </div>
                      )}

                      {!carregandoComentarios && renderComentarios(post)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* Sidebar Direita */}
        <aside className="rightbar sidebar">
          <div className="rightbar-section">
            <h4><i className="fas fa-fire"></i> Projetos em Alta</h4>
            {[
              { name: 'WordPress', bg: '3B8CDE', title: 'Site WordPress', user: 'Maria Silva', time: 'há 3h', budget: 'R$ 1.500', candidates: '12 candidatos' },
              { name: 'E-commerce', bg: '28a745', title: 'E-commerce', user: 'João Santos', time: 'há 5h', budget: 'R$ 2.000', candidates: '8 candidatos' },
              { name: 'Python', bg: 'ffc107', title: 'Automação Python', user: 'Carlos Lima', time: 'há 1d', budget: 'R$ 1.000', candidates: '6 candidatos' }
            ].map((item, i) => (
              <div key={i} className="mini-card">
                <div className="mini-card-header">
                  <img src={`https://ui-avatars.com/api/?name=${item.name}&background=${item.bg}&color=fff`} alt={item.name} className="mini-card-avatar" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.user} • {item.time}</p>
                  </div>
                </div>
                <div className="mini-card-footer">
                  <span className="budget">{item.budget}</span>
                  <span className="applicants">{item.candidates}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rightbar-section">
            <h4><i className="fas fa-users"></i> Freelancers Sugeridos</h4>
            {[
              { name: 'Ana Costa', bg: '17a2b8', role: 'UX Designer', rating: 4.2 },
              { name: 'Pedro Ribeiro', bg: 'dc3545', role: 'Backend Developer', rating: 4.5 }
            ].map((item, i) => (
              <div key={i} className="freelancer-card">
                <img src={`https://ui-avatars.com/api/?name=${item.name}&background=${item.bg}&color=fff`} alt={item.name} className="freelancer-avatar" />
                <div className="freelancer-info">
                  <strong>{item.name}</strong>
                  <p>{item.role}</p>
                  <div className="freelancer-rating">
                    {[...Array(5)].map((_, j) => (<i key={j} className={j < Math.floor(item.rating) ? 'fas fa-star' : j < item.rating ? 'fas fa-star-half-alt' : 'far fa-star'} />))}
                    <span>{item.rating}</span>
                  </div>
                </div>
                <button className="contact-btn"><i className="fas fa-envelope" /></button>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {modalAberto && (
        <div ref={modalRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, cursor: 'pointer' }} onClick={fecharModal}>
          <button onClick={fecharModal} style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', fontSize: '40px', cursor: 'pointer', zIndex: 10000, fontWeight: 'bold' }}>×</button>
          {videoModal ? (
            <video src={imagemModal} controls autoPlay style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={imagemModal} alt="Visualização ampliada" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} onClick={(e) => e.stopPropagation()} />
          )}
          <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '20px', fontSize: '14px' }}>Clique fora para fechar</div>
        </div>
      )}
    </>
  );
};

export default AriaTrabalho;