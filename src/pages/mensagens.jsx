import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/App3.css';

const Mensagens = () => {
  const navigate = useNavigate();

  // ===== CONFIGURAÇÃO SUPABASE =====
  const SUPABASE_CONFIG = {
    URL: 'https://tgnwbxcygmjipupufoix.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbndieGN5Z21qaXB1cHVmb2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDI4NDcsImV4cCI6MjA4NzE3ODg0N30.78BjN7G0a0lnUwXmveggL0GQD-Xp-5C7QYUBmfOIt_s'
  };

  // ===== CONSTANTES =====
  const DEFAULT_AVATAR = '/img/711769.png';
  const BUCKET_NAME = 'mensagens';

  // ===== ESTADOS =====
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentChatUser, setCurrentChatUser] = useState(null);
  const [amigos, setAmigos] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cachePerfis, setCachePerfis] = useState(new Map());
  const [modalImage, setModalImage] = useState(null);
  const [menuMessageId, setMenuMessageId] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [showDeleteAllMenu, setShowDeleteAllMenu] = useState(false);

  // ===== REFS =====
  const chatMessagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const menuRef = useRef(null);
  const deleteAllMenuRef = useRef(null);

  // ===== UTILS =====
  const getAuthHeaders = (includeContentType = true) => {
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
  };

  const formatarHorarioMsg = (timestamp) => {
    if (!timestamp) return '';
    const data = new Date(timestamp);
    if (isNaN(data.getTime())) return '';
    
    const agora = new Date();
    const diffMs = agora - data;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) {
      return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDias === 1) {
      return 'ontem';
    } else if (diffDias < 7) {
      const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      return diasSemana[data.getDay()];
    } else {
      return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const formatarDataSeparador = (timestamp) => {
    if (!timestamp) return '';
    const data = new Date(timestamp);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getIniciais = (nome) => {
    if (!nome || nome === "Usuário" || nome === "Sem nome") return '?';
    return nome
      .split(' ')
      .map(palavra => palavra.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const gerarAvatarIniciais = (nome) => {
    if (!nome || nome === "Usuário" || nome === "Sem nome") return DEFAULT_AVATAR;
    
    const iniciais = getIniciais(nome);
    
    const cores = [
      '#0a66c2', '#28a745', '#dc3545', '#fd7e14', '#6f42c1', '#e83e8c',
      '#20c997', '#17a2b8', '#6610f2', '#e4606d', '#f4b942', '#6c5ce7'
    ];
    const indice = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % cores.length;
    const cor = cores[indice];
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="${cor}"/>
        <text x="50" y="50" font-size="40" text-anchor="middle" dy=".3em" fill="white" font-family="Arial, sans-serif" font-weight="bold">${iniciais}</text>
      </svg>
    `)}`;
  };

  // ===== BUSCAR FOTO DO PERFIL =====
  const getFotoPerfilUsuario = useCallback(async (userId, nome) => {
    if (!userId) return gerarAvatarIniciais(nome);
    if (cachePerfis.has(userId)) return cachePerfis.get(userId);
    
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/perfil?id_usuarios=eq.${userId}&select=avatar_url`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const perfis = await response.json();
        if (perfis[0]?.avatar_url && perfis[0]?.avatar_url !== '') {
          setCachePerfis(prev => new Map(prev).set(userId, perfis[0].avatar_url));
          return perfis[0].avatar_url;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar foto:', error);
    }
    const avatarIniciais = gerarAvatarIniciais(nome);
    setCachePerfis(prev => new Map(prev).set(userId, avatarIniciais));
    return avatarIniciais;
  }, [cachePerfis]);

  // ===== CARREGAR USUÁRIO LOGADO =====
  const carregarUsuarioLogado = async () => {
    try {
      const storedUser = localStorage.getItem('usuarioLogado');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUsuarioLogado(user);
        setCurrentUserId(user.id);
        return true;
      } else {
        alert("Você precisa estar logado!");
        navigate('/faca-login');
        return false;
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      return false;
    }
  };

  // ===== CARREGAR USUÁRIO POR ID =====
  const carregarUsuarioPorId = useCallback(async (userId) => {
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/usuarios?id=eq.${userId}`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const usuarios = await response.json();
        if (usuarios.length > 0) {
          const fotoPerfil = await getFotoPerfilUsuario(userId, usuarios[0].nome);
          return { ...usuarios[0], fotoPerfil };
        }
      }
      return null;
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      return null;
    }
  }, [getFotoPerfilUsuario]);

  // ===== BUSCAR ÚLTIMA MENSAGEM E DATA =====
  const buscarUltimaMensagem = useCallback(async (amigoId) => {
    if (!currentUserId) return null;
    
    try {
      const conversaId = [currentUserId, amigoId].sort().join('_');
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/mensagens?conversa_id=eq.${conversaId}&order=timestamp.desc&limit=1`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const mensagensData = await response.json();
        if (mensagensData.length > 0) {
          const msg = mensagensData[0];
          const horario = formatarHorarioMsg(msg.timestamp);
          const dataMsg = new Date(msg.timestamp);
          
          let prefixo = '';
          if (msg.remetente_id == currentUserId) prefixo = 'Você: ';
          
          let textoMsg = '';
          if (msg.tipo === 'texto') {
            textoMsg = msg.conteudo.length > 30 
              ? msg.conteudo.substring(0, 30) + '...' 
              : msg.conteudo;
          } else if (msg.tipo === 'imagem') {
            textoMsg = '📷 Foto';
          } else if (msg.tipo === 'video') {
            textoMsg = '🎥 Vídeo';
          } else if (msg.tipo === 'audio') {
            textoMsg = '🎵 Áudio';
          } else {
            textoMsg = '📎 Arquivo';
          }
          
          return {
            texto: `${prefixo}${textoMsg}`,
            horario: horario,
            timestamp: dataMsg,
            ehMinha: msg.remetente_id == currentUserId
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar última mensagem:', error);
      return null;
    }
  }, [currentUserId]);

  // ===== CARREGAR AMIGOS COM ORDENAÇÃO POR ÚLTIMA MENSAGEM =====
  const carregarAmigos = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/pedidos_amizade?or=(id_remetente.eq.${currentUserId},id_destinatario.eq.${currentUserId})&status=eq.aceito`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error('Erro ao carregar amigos');

      const pedidos = await response.json();
      const amigosIds = [];

      for (let pedido of pedidos) {
        if (pedido.id_remetente == currentUserId) {
          amigosIds.push(pedido.id_destinatario);
        } else {
          amigosIds.push(pedido.id_remetente);
        }
      }

      const amigosData = [];
      for (let id of amigosIds) {
        try {
          const userResponse = await fetch(
            `${SUPABASE_CONFIG.URL}/rest/v1/usuarios?id=eq.${id}`,
            { headers: getAuthHeaders() }
          );
          if (userResponse.ok) {
            const users = await userResponse.json();
            if (users.length > 0) {
              const fotoPerfil = await getFotoPerfilUsuario(id, users[0].nome);
              const ultimaMsgData = await buscarUltimaMensagem(id);
              
              amigosData.push({
                ...users[0],
                fotoPerfil,
                ultimaMsg: ultimaMsgData?.texto || null,
                ultimaMsgHorario: ultimaMsgData?.horario || null,
                ultimaMsgTimestamp: ultimaMsgData?.timestamp || new Date(0),
                ultimaMsgEhMinha: ultimaMsgData?.ehMinha || false,
                iniciais: getIniciais(users[0].nome)
              });
            }
          }
        } catch (error) {
          console.error(`Erro ao buscar amigo ${id}:`, error);
        }
      }
      
      const amigosOrdenados = amigosData.sort((a, b) => {
        const timestampA = a.ultimaMsgTimestamp || new Date(0);
        const timestampB = b.ultimaMsgTimestamp || new Date(0);
        return timestampB - timestampA;
      });
      
      setAmigos(amigosOrdenados);
    } catch (error) {
      console.error("Erro ao carregar amigos:", error);
    }
  }, [currentUserId, getFotoPerfilUsuario, buscarUltimaMensagem]);

  // ===== CARREGAR MENSAGENS =====
  const carregarMensagens = useCallback(async (amigoId) => {
    if (!currentUserId || !amigoId) return;
    
    const conversaId = [currentUserId, amigoId].sort().join('_');
    
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/mensagens?conversa_id=eq.${conversaId}&order=timestamp.asc`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) return;

      const mensagensData = await response.json();
      setMensagens(mensagensData);
      
      if (currentChatUser) {
        await carregarAmigos();
      }
      
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 100);
      
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  }, [currentUserId, currentChatUser, carregarAmigos]);

  // ===== APAGAR MENSAGEM =====
  const apagarMensagem = async (messageId) => {
    if (!window.confirm('Tem certeza que deseja apagar esta mensagem?')) return;
    
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/mensagens?id=eq.${messageId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );
      
      if (!response.ok) {
        throw new Error('Erro ao apagar mensagem');
      }
      
      if (currentChatUser) {
        await carregarMensagens(currentChatUser.id);
        await carregarAmigos();
      }
      
      setMenuMessageId(null);
      
    } catch (error) {
      console.error('Erro ao apagar mensagem:', error);
      alert('Erro ao apagar mensagem. Tente novamente.');
    }
  };

  // ===== APAGAR TODAS AS MENSAGENS DA CONVERSA =====
  const apagarTodasMensagens = async () => {
    if (!currentChatUser) return;
    
    if (!window.confirm(`Tem certeza que deseja apagar TODAS as mensagens da conversa com ${currentChatUser.nome}?\n\nEsta ação não pode ser desfeita.`)) return;
    
    try {
      const conversaId = [currentUserId, currentChatUser.id].sort().join('_');
      
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/mensagens?conversa_id=eq.${conversaId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );
      
      if (!response.ok) {
        throw new Error('Erro ao apagar todas as mensagens');
      }
      
      await carregarMensagens(currentChatUser.id);
      await carregarAmigos();
      setShowDeleteAllMenu(false);
      
    } catch (error) {
      console.error('Erro ao apagar todas as mensagens:', error);
      alert('Erro ao apagar todas as mensagens. Tente novamente.');
    }
  };

  // ===== ENVIAR MENSAGEM =====
  const enviarMensagem = async () => {
    if (!inputMessage.trim() || !currentUserId || !currentChatUser) return;
    
    const conversaId = [currentUserId, currentChatUser.id].sort().join('_');
    
    try {
      const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/mensagens`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conversa_id: conversaId,
          remetente_id: currentUserId,
          destinatario_id: currentChatUser.id,
          tipo: 'texto',
          conteudo: inputMessage.trim(),
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.error('Erro ao enviar mensagem');
        return;
      }

      setInputMessage('');
      await carregarMensagens(currentChatUser.id);
      await carregarAmigos();
      
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  // ===== CONVERTER ARQUIVO PARA BASE64 =====
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // ===== ENVIAR ARQUIVO COMO BASE64 =====
  const enviarArquivo = async (file) => {
    if (!file || !currentUserId || !currentChatUser) {
      console.error('Arquivo ou usuário não disponível');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande! Máximo 2MB para imagens.');
      return;
    }
    
    if (!file.type.startsWith("image/")) {
      alert('Por enquanto, apenas imagens são suportadas!');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const base64Image = await fileToBase64(file);
      const conversaId = [currentUserId, currentChatUser.id].sort().join('_');
      
      const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/mensagens`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conversa_id: conversaId,
          remetente_id: currentUserId,
          destinatario_id: currentChatUser.id,
          tipo: 'imagem',
          conteudo: file.name,
          url: base64Image,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar mensagem');
      }
      
      await carregarMensagens(currentChatUser.id);
      await carregarAmigos();
      
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      alert(`Erro ao enviar imagem: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== ABRIR CHAT =====
  const abrirChat = async (amigo) => {
    setCurrentChatUser(amigo);
    await carregarMensagens(amigo.id);
    setShowDeleteAllMenu(false);
  };

  // ===== FECHAR CHAT =====
  const fecharChat = () => {
    setCurrentChatUser(null);
    setMensagens([]);
    setMenuMessageId(null);
    setShowDeleteAllMenu(false);
  };

  // ===== VERIFICAR DESTINATÁRIO PENDENTE =====
  const verificarDestinatarioPendente = useCallback(async () => {
    const destinatarioId = sessionStorage.getItem('chatDestinatarioId');
    
    if (destinatarioId && currentUserId) {
      sessionStorage.removeItem('chatDestinatarioId');
      
      const destinatario = await carregarUsuarioPorId(parseInt(destinatarioId));
      if (destinatario) {
        abrirChat(destinatario);
      }
    }
  }, [currentUserId, carregarUsuarioPorId]);

  // ===== FECHAR MENUS AO CLICAR FORA =====
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuMessageId(null);
      }
      if (deleteAllMenuRef.current && !deleteAllMenuRef.current.contains(event.target)) {
        setShowDeleteAllMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ===== POLLING PARA NOVAS MENSAGENS =====
  useEffect(() => {
    if (currentChatUser && currentUserId) {
      const pollInterval = setInterval(() => {
        carregarMensagens(currentChatUser.id);
      }, 3000);
      
      pollingIntervalRef.current = pollInterval;
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [currentChatUser, currentUserId, carregarMensagens]);

  // ===== FILTRAR AMIGOS =====
  const amigosFiltrados = amigos.filter(amigo => 
    amigo.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ===== RENDER MENSAGENS =====
  const renderMensagens = () => {
    if (!mensagens.length) {
      return (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#999'
        }}>
          <p>Nenhuma mensagem ainda. Envie a primeira mensagem!</p>
        </div>
      );
    }

    let ultimaData = null;
    
    return mensagens.map((msg, index) => {
      const dataMsg = new Date(msg.timestamp);
      const dataAtual = dataMsg.toDateString();
      const ehEnviada = msg.remetente_id == currentUserId;
      const mostrarSeparador = ultimaData !== dataAtual;
      const isHovered = hoveredMessageId === msg.id;
      
      if (mostrarSeparador) {
        ultimaData = dataAtual;
      }
      
      return (
        <React.Fragment key={msg.id || index}>
          {mostrarSeparador && (
            <div style={{ 
              margin: '20px 0 10px 0',
              paddingLeft: '10px'
            }}>
              <span style={{ 
                fontSize: '13px', 
                color: '#666',
                fontWeight: '500'
              }}>
                {formatarDataSeparador(msg.timestamp)}
              </span>
            </div>
          )}
          
          <div 
            style={{
              display: 'flex',
              justifyContent: ehEnviada ? 'flex-end' : 'flex-start',
              marginBottom: '8px',
              position: 'relative'
            }}
            onMouseEnter={() => ehEnviada && setHoveredMessageId(msg.id)}
            onMouseLeave={() => ehEnviada && setHoveredMessageId(null)}
          >
            <div style={{
              maxWidth: '70%',
              padding: '8px 12px',
              background: ehEnviada ? '#0a66c2' : '#e9ecef',
              color: ehEnviada ? '#fff' : '#1a1a1a',
              borderRadius: '12px',
              borderTopRightRadius: ehEnviada ? '4px' : '12px',
              borderTopLeftRadius: ehEnviada ? '12px' : '4px',
              wordBreak: 'break-word',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}>
              {msg.tipo === 'texto' && (
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4', paddingRight: ehEnviada ? '0' : '0' }}>
                  {msg.conteudo}
                </p>
              )}
              {msg.tipo === 'imagem' && msg.url && (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={msg.url} 
                    alt="Imagem" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '200px', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onClick={() => setModalImage(msg.url)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                </div>
              )}
              <div style={{
                fontSize: '10px',
                marginTop: '4px',
                textAlign: 'right',
                opacity: 0.7,
                color: ehEnviada ? 'rgba(255,255,255,0.8)' : '#666'
              }}>
                {formatarHorarioMsg(msg.timestamp)}
              </div>
              
              {/* Menu de três pontos - aparece apenas no hover */}
              {ehEnviada && isHovered && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuMessageId(menuMessageId === msg.id ? null : msg.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '-28px',
                      right: '-8px',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '12px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      backdropFilter: 'blur(4px)',
                      opacity: 0.9
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Opções"
                  >
                    <i className="fas fa-ellipsis-v" style={{ fontSize: '12px' }}></i>
                  </button>
                  
                  {/* Menu dropdown */}
                  {menuMessageId === msg.id && (
                    <div
                      ref={menuRef}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        right: '-8px',
                        marginBottom: '8px',
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        minWidth: '150px',
                        zIndex: 100,
                        overflow: 'hidden',
                        animation: 'fadeInUp 0.2s ease'
                      }}
                    >
                      <button
                        onClick={() => apagarMensagem(msg.id)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: 'none',
                          background: 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: '#dc3545',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fef2f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        <i className="fas fa-trash-alt" style={{ fontSize: '12px' }}></i>
                        Apagar mensagem
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  // ===== MODAL DE VISUALIZAÇÃO DE IMAGEM =====
  const renderImageModal = () => {
    if (!modalImage) return null;
    
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          cursor: 'pointer'
        }}
        onClick={() => setModalImage(null)}
      >
        <div style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          animation: 'zoomIn 0.2s ease'
        }}>
          <img 
            src={modalImage} 
            alt="Visualização ampliada" 
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModalImage(null);
            }}
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#333',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f0f0';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              fontSize: '14px',
              background: 'rgba(0,0,0,0.6)',
              padding: '6px 12px',
              borderRadius: '20px',
              whiteSpace: 'nowrap'
            }}
          >
            Clique em qualquer lugar para fechar
          </div>
        </div>
      </div>
    );
  };

  // ===== EFFECTS =====
  useEffect(() => {
    const init = async () => {
      const usuarioCarregado = await carregarUsuarioLogado();
      if (usuarioCarregado) {
        await carregarAmigos();
        await verificarDestinatarioPendente();
      }
    };
    init();
  }, [carregarAmigos, verificarDestinatarioPendente]);

  // ===== HANDLERS =====
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      enviarArquivo(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (modalImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalImage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <header style={{ 
        background: 'white', 
        padding: '20px 30px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <a href="/aria-trabalho" style={{ 
            textDecoration: 'none', 
            color: '#0a66c2', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            fontWeight: '500'
          }}>
            <i className="fas fa-arrow-left"></i>
            <span>FreelanceHub</span>
          </a>
        </div>
        <div>
          <h1 style={{ fontSize: '24px', color: '#0a66c2', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-comment-dots"></i> Mensagens
          </h1>
          <p style={{ color: '#666', marginTop: '5px', fontSize: '14px' }}>Selecione um perfil para conversar</p>
        </div>
      </header>

      {/* Container principal */}
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden', 
        margin: '20px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        
        {/* Sidebar de amigos */}
        <aside style={{ 
          width: '320px', 
          background: 'white', 
          borderRight: '1px solid #e0e0e0', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '18px', color: '#0a66c2', marginBottom: '15px' }}>
              <i className="fas fa-users"></i> Amigos
            </h2>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: '14px' }}></i>
              <input 
                type="text" 
                placeholder="Buscar amigos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px 12px 10px 35px', 
                  border: '1px solid #ddd', 
                  borderRadius: '20px', 
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {amigosFiltrados.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                {searchTerm ? 'Nenhum amigo encontrado' : 'Você ainda não tem amigos'}
              </p>
            ) : (
              amigosFiltrados.map(amigo => (
                <div 
                  key={amigo.id} 
                  onClick={() => abrirChat(amigo)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px 20px',
                    cursor: 'pointer',
                    background: currentChatUser?.id === amigo.id ? '#e3f2fd' : 'transparent',
                    borderLeft: currentChatUser?.id === amigo.id ? '3px solid #0a66c2' : '3px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (currentChatUser?.id !== amigo.id) {
                      e.currentTarget.style.background = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentChatUser?.id !== amigo.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ width: '48px', height: '48px', flexShrink: 0, position: 'relative' }}>
                    <img 
                      src={amigo.fotoPerfil} 
                      alt={amigo.nome} 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = gerarAvatarIniciais(amigo.nome);
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#333', 
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {amigo.nome || 'Usuário'}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#999',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <span style={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        flex: 1
                      }}>
                        {amigo.ultimaMsg || 'Clique para conversar'}
                      </span>
                      {amigo.ultimaMsgHorario && (
                        <span style={{ 
                          fontSize: '10px', 
                          color: '#bbb',
                          flexShrink: 0
                        }}>
                          {amigo.ultimaMsgHorario}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Área do chat */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
          {!currentChatUser ? (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999'
            }}>
              <p>Selecione um amigo para começar a conversar</p>
            </div>
          ) : (
            <>
              {/* Chat Header com botão de apagar todas as mensagens */}
              <div style={{ 
                padding: '16px 24px', 
                background: 'white', 
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px' }}>
                    <img 
                      src={currentChatUser.fotoPerfil} 
                      alt={currentChatUser.nome}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = gerarAvatarIniciais(currentChatUser.nome);
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>
                      {currentChatUser.nome}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      Offline
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Botão discreto para apagar todas as mensagens */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowDeleteAllMenu(!showDeleteAllMenu)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ccc',
                        transition: 'all 0.2s',
                        fontSize: '14px',
                        opacity: 0.6
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                        e.currentTarget.style.color = '#dc3545';
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#ccc';
                        e.currentTarget.style.opacity = '0.6';
                      }}
                      title="Apagar todas as mensagens"
                    >
                      <i className="fas fa-trash-alt" style={{ fontSize: '14px' }}></i>
                    </button>
                    
                    {/* Menu de confirmação para apagar todas */}
                    {showDeleteAllMenu && (
                      <div
                        ref={deleteAllMenuRef}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: '0',
                          marginTop: '8px',
                          background: 'white',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          minWidth: '200px',
                          zIndex: 100,
                          overflow: 'hidden',
                          animation: 'fadeInUp 0.2s ease'
                        }}
                      >
                        <div style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '12px',
                          color: '#666',
                          background: '#fafafa'
                        }}>
                          Apagar todas as mensagens?
                        </div>
                        <button
                          onClick={apagarTodasMensagens}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'white',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#dc3545',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fef2f2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                          }}
                        >
                          <i className="fas fa-trash-alt" style={{ fontSize: '12px' }}></i>
                          Sim, apagar todas
                        </button>
                        <button
                          onClick={() => setShowDeleteAllMenu(false)}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'white',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#666',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderTop: '1px solid #f0f0f0'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                          }}
                        >
                          <i className="fas fa-times" style={{ fontSize: '12px' }}></i>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={fecharChat}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#bbb',
                      transition: 'all 0.2s',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                      e.currentTarget.style.color = '#999';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#bbb';
                    }}
                    title="Fechar conversa"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div 
                ref={chatMessagesRef}
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {renderMensagens()}
              </div>

              {/* Chat Input */}
              <div style={{ 
                padding: '16px 24px', 
                background: 'white', 
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                gap: '12px'
              }}>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    border: 'none', 
                    background: isLoading ? '#e0e0e0' : '#f0f0f0',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Enviar imagem (máx. 2MB)"
                >
                  <i className="fas fa-image" style={{ color: isLoading ? '#999' : '#666', fontSize: '18px' }}></i>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <input 
                  type="text" 
                  placeholder="Digite sua mensagem..." 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  style={{ 
                    flex: 1, 
                    padding: '10px 16px', 
                    border: '1px solid #ddd', 
                    borderRadius: '24px', 
                    fontSize: '14px',
                    outline: 'none',
                    background: isLoading ? '#f5f5f5' : 'white'
                  }}
                />
                <button 
                  onClick={enviarMensagem}
                  disabled={!inputMessage.trim() || isLoading}
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    border: 'none', 
                    background: !inputMessage.trim() || isLoading ? '#ccc' : '#0a66c2',
                    cursor: !inputMessage.trim() || isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="fas fa-paper-plane" style={{ color: 'white' }}></i>
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal de visualização de imagem */}
      {renderImageModal()}

      {/* Loading spinner */}
      {isLoading && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #f3f3f3', 
            borderTop: '3px solid #0a66c2', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }}></div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default Mensagens;