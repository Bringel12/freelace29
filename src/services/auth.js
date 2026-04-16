// Configuração do Supabase via fetch API (sem precisar instalar o pacote)
const SUPABASE_URL = 'https://tgnwbxcygmjipupufoix.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbndieGN5Z21qaXB1cHVmb2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDI4NDcsImV4cCI6MjA4NzE3ODg0N30.78BjN7G0a0lnUwXmveggL0GQD-Xp-5C7QYUBmfOIt_s';

// Cache simples
const cachePerfis = new Map();
const cacheUsuarios = new Map();

// Headers padrão para requisições
const getHeaders = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
});

// ===== FUNÇÕES DE AUTENTICAÇÃO =====

// Fazer login
export const fazerLogin = async (email, senha) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}&senha=eq.${encodeURIComponent(senha)}&select=*`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro na requisição');

    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('E-mail ou senha inválidos');
    }

    const user = data[0];
    localStorage.setItem('usuarioLogado', JSON.stringify(user));
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Fazer logout
export const fazerLogout = () => {
  localStorage.removeItem('usuarioLogado');
  return { success: true };
};

// Criar conta
export const criarConta = async (nome, email, senha) => {
  try {
    // Inserir na tabela usuarios
    const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        nome,
        email,
        senha
      })
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Erro ao criar usuário: ${errorText}`);
    }

    const userData = await userResponse.json();
    const userId = userData[0].id;

    // Criar perfil para o usuário
    const perfilResponse = await fetch(`${SUPABASE_URL}/rest/v1/perfil`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        id_usuarios: userId,
        nome_completo: nome,
        tipo_usuario: 'freelancer',
        avatar_url: 'img/711769.png'
      })
    });

    if (!perfilResponse.ok) {
      throw new Error('Erro ao criar perfil');
    }

    localStorage.setItem('usuarioLogado', JSON.stringify(userData[0]));
    
    return { success: true, user: userData[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Obter usuário logado
export const getUsuarioLogado = () => {
  const storedUser = localStorage.getItem('usuarioLogado');
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  }
  return null;
};

// Verificar se está autenticado
export const isAuthenticated = () => {
  return !!localStorage.getItem('usuarioLogado');
};

// ===== FUNÇÕES DE PERFIL =====

// Carregar perfil do usuário
export const carregarPerfilUsuario = async (userId) => {
  if (!userId) return null;
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${userId}`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao carregar perfil');

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    return null;
  }
};

// Obter nome do usuário (com cache)
export const getNomeUsuario = async (userId) => {
  if (!userId) return 'Usuário';
  
  if (cacheUsuarios.has(userId)) {
    return cacheUsuarios.get(userId);
  }
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}&select=nome`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao carregar nome');

    const usuarios = await response.json();
    const nome = (usuarios.length > 0 && usuarios[0].nome) ? usuarios[0].nome : 'Usuário';
    cacheUsuarios.set(userId, nome);
    return nome;
  } catch (error) {
    console.error('Erro ao carregar nome:', error);
    return 'Usuário';
  }
};

// Obter foto do perfil (com cache)
export const getFotoPerfilUsuario = async (userId) => {
  if (!userId) return 'img/711769.png';
  
  if (cachePerfis.has(userId)) {
    return cachePerfis.get(userId);
  }
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${userId}&select=avatar_url`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao carregar foto');

    const perfis = await response.json();
    const foto = (perfis.length > 0 && perfis[0].avatar_url) ? perfis[0].avatar_url : 'img/711769.png';
    cachePerfis.set(userId, foto);
    return foto;
  } catch (error) {
    console.error('Erro ao carregar foto:', error);
    return 'img/711769.png';
  }
};

// Atualizar perfil
export const atualizarPerfil = async (userId, dados) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/perfil?id_usuarios=eq.${userId}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(dados)
      }
    );

    if (!response.ok) throw new Error('Erro ao atualizar perfil');
    
    cachePerfis.delete(userId);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== FUNÇÕES DE POSTAGEM =====

// Carregar postagens
export const carregarPostagens = async () => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?order=data_postagem.desc`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao carregar postagens');

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Criar postagem
export const criarPostagem = async (dados) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(dados)
    });

    if (!response.ok) throw new Error('Erro ao criar postagem');

    const data = await response.json();
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Atualizar postagem
export const atualizarPostagem = async (postId, dados) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(dados)
      }
    );

    if (!response.ok) throw new Error('Erro ao atualizar postagem');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Deletar postagem
export const deletarPostagem = async (postId) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao deletar postagem');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== FUNÇÕES DE CURTIDAS =====

// Curtir post
export const curtirPost = async (usuarioId, postId) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/curtidas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        id_usuario: usuarioId,
        id_post: parseInt(postId),
        data_curtida: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error('Erro ao curtir');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Descurtir post
export const descurtirPost = async (usuarioId, postId) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/curtidas?id_usuario=eq.${usuarioId}&id_post=eq.${postId}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao descurtir');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Verificar se usuário curtiu post
export const usuarioCurtiuPost = async (usuarioId, postId) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/curtidas?id_usuario=eq.${usuarioId}&id_post=eq.${postId}`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao verificar curtida');

    const data = await response.json();
    return data.length > 0;
  } catch (error) {
    return false;
  }
};

// ===== FUNÇÕES DE COMENTÁRIOS =====

// Carregar comentários de um post
export const carregarComentarios = async (postId) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/comentarios?id_post=eq.${postId}&order=data_comentario.asc`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao carregar comentários');

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Adicionar comentário
export const adicionarComentario = async (postId, usuarioId, conteudo) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/comentarios`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id_post: parseInt(postId),
        id_usuario: usuarioId,
        conteudo: conteudo,
        curtidas: 0,
        data_comentario: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error('Erro ao adicionar comentário');

    const data = await response.json();
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Atualizar comentário
export const atualizarComentario = async (comentarioId, conteudo) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/comentarios?id=eq.${comentarioId}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          conteudo: conteudo,
          data_atualizacao: new Date().toISOString()
        })
      }
    );

    if (!response.ok) throw new Error('Erro ao atualizar comentário');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Deletar comentário
export const deletarComentario = async (comentarioId) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/comentarios?id=eq.${comentarioId}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao deletar comentário');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Curtir comentário
export const curtirComentario = async (usuarioId, comentarioId) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/curtidas_comentarios`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        id_usuario: usuarioId,
        id_comentario: parseInt(comentarioId),
        data_curtida: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error('Erro ao curtir comentário');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Descurtir comentário
export const descurtirComentario = async (usuarioId, comentarioId) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/curtidas_comentarios?id_usuario=eq.${usuarioId}&id_comentario=eq.${comentarioId}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao descurtir comentário');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== FUNÇÕES DE RESPOSTAS =====

// Carregar respostas de um comentário
export const carregarRespostas = async (comentarioId) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/respostas_comentarios?id_comentario=eq.${comentarioId}&order=data_resposta.asc`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao carregar respostas');

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Adicionar resposta
export const adicionarResposta = async (comentarioId, usuarioId, conteudo) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/respostas_comentarios`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id_comentario: parseInt(comentarioId),
        id_usuario: usuarioId,
        conteudo: conteudo,
        curtidas: 0,
        data_resposta: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error('Erro ao adicionar resposta');

    const data = await response.json();
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Atualizar resposta
export const atualizarResposta = async (respostaId, conteudo) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/respostas_comentarios?id=eq.${respostaId}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          conteudo: conteudo,
          data_atualizacao: new Date().toISOString()
        })
      }
    );

    if (!response.ok) throw new Error('Erro ao atualizar resposta');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Deletar resposta
export const deletarResposta = async (respostaId) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/respostas_comentarios?id=eq.${respostaId}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao deletar resposta');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Curtir resposta
export const curtirResposta = async (usuarioId, respostaId) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/curtidas_respostas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        id_usuario: usuarioId,
        id_resposta: parseInt(respostaId),
        data_curtida: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error('Erro ao curtir resposta');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Descurtir resposta
export const descurtirResposta = async (usuarioId, respostaId) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/curtidas_respostas?id_usuario=eq.${usuarioId}&id_resposta=eq.${respostaId}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    );

    if (!response.ok) throw new Error('Erro ao descurtir resposta');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ===== FUNÇÕES DE UPLOAD =====

// Upload de arquivo para o storage (objeto simulando o supabase.storage)
export const storage = {
  from: (bucket) => ({
    upload: async (caminho, arquivo) => {
      try {
        const formData = new FormData();
        formData.append('file', arquivo);

        const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${caminho}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Falha no upload: ${errorText}`);
        }

        return { error: null };
      } catch (error) {
        return { error };
      }
    },
    getPublicUrl: (caminho) => ({
      data: {
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${caminho}`
      }
    }),
    remove: async (caminhos) => {
      try {
        // Para múltiplos arquivos, precisamos deletar um por um
        for (const caminho of caminhos) {
          const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${caminho}`, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          });

          if (!response.ok) {
            throw new Error(`Erro ao deletar ${caminho}`);
          }
        }
        return { error: null };
      } catch (error) {
        return { error };
      }
    }
  })
};

// Upload de múltiplos arquivos (função auxiliar)
export const uploadMultiplosArquivos = async (bucket, pasta, arquivos) => {
  const urls = [];
  
  for (const arquivo of arquivos) {
    if (arquivo.size > 10 * 1024 * 1024) {
      throw new Error(`Arquivo ${arquivo.name} muito grande (máx 10MB)`);
    }
    
    const fileName = `${pasta}/${Date.now()}_${arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    const { error } = await storage.from(bucket).upload(fileName, arquivo);
    
    if (error) {
      throw new Error(`Erro no upload: ${error.message}`);
    }
    
    const { data: { publicUrl } } = storage.from(bucket).getPublicUrl(fileName);
    urls.push(publicUrl);
  }
  
  return urls;
};

// ===== FUNÇÕES UTILITÁRIAS =====

// Limpar cache
export const limparCache = () => {
  cachePerfis.clear();
  cacheUsuarios.clear();
};

// Calcular tempo relativo
export const calcularTempoRelativo = (data) => {
  const agora = new Date();
  const dataPost = new Date(data);
  const diffMin = Math.floor((agora - dataPost) / 60000);
  
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffMin < 1440) return `há ${Math.floor(diffMin / 60)} h`;
  if (diffMin < 43200) return `há ${Math.floor(diffMin / 1440)} d`;
  return `há ${Math.floor(diffMin / 43200)} meses`;
};

// Objeto principal que simula o cliente Supabase
export const supabase = {
  from: (tabela) => ({
    select: (colunas = '*') => ({
      eq: (coluna, valor) => ({
        single: async () => {
          try {
            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/${tabela}?${coluna}=eq.${encodeURIComponent(valor)}&select=${colunas}`,
              {
                headers: getHeaders()
              }
            );
            if (!response.ok) throw new Error('Erro na requisição');
            const data = await response.json();
            return { data: data[0] || null, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
        order: (coluna, { ascending }) => ({
          then: async (resolve, reject) => {
            try {
              const order = ascending ? 'asc' : 'desc';
              const response = await fetch(
                `${SUPABASE_URL}/rest/v1/${tabela}?${coluna}=eq.${encodeURIComponent(valor)}&order=${coluna}.${order}&select=${colunas}`,
                {
                  headers: getHeaders()
                }
              );
              if (!response.ok) throw new Error('Erro na requisição');
              const data = await response.json();
              resolve({ data, error: null });
            } catch (error) {
              reject({ data: null, error });
            }
          }
        }),
        then: async (resolve, reject) => {
          try {
            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/${tabela}?${coluna}=eq.${encodeURIComponent(valor)}&select=${colunas}`,
              {
                headers: getHeaders()
              }
            );
            if (!response.ok) throw new Error('Erro na requisição');
            const data = await response.json();
            resolve({ data, error: null });
          } catch (error) {
            reject({ data: null, error });
          }
        }
      }),
      order: (coluna, { ascending }) => ({
        then: async (resolve, reject) => {
          try {
            const order = ascending ? 'asc' : 'desc';
            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/${tabela}?order=${coluna}.${order}&select=${colunas}`,
              {
                headers: getHeaders()
              }
            );
            if (!response.ok) throw new Error('Erro na requisição');
            const data = await response.json();
            resolve({ data, error: null });
          } catch (error) {
            reject({ data: null, error });
          }
        }
      }),
      then: async (resolve, reject) => {
        try {
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${tabela}?select=${colunas}`,
            {
              headers: getHeaders()
            }
          );
          if (!response.ok) throw new Error('Erro na requisição');
          const data = await response.json();
          resolve({ data, error: null });
        } catch (error) {
          reject({ data: null, error });
        }
      }
    }),
    insert: (dados) => ({
      select: () => ({
        then: async (resolve, reject) => {
          try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
              method: 'POST',
              headers: {
                ...getHeaders(),
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(Array.isArray(dados) ? dados : [dados])
            });
            if (!response.ok) throw new Error('Erro ao inserir');
            const data = await response.json();
            resolve({ data, error: null });
          } catch (error) {
            reject({ data: null, error });
          }
        }
      }),
      then: async (resolve, reject) => {
        try {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(Array.isArray(dados) ? dados : [dados])
          });
          if (!response.ok) throw new Error('Erro ao inserir');
          resolve({ data: null, error: null });
        } catch (error) {
          reject({ data: null, error });
        }
      }
    }),
    update: (dados) => ({
      eq: (coluna, valor) => ({
        then: async (resolve, reject) => {
          try {
            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/${tabela}?${coluna}=eq.${encodeURIComponent(valor)}`,
              {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify(dados)
              }
            );
            if (!response.ok) throw new Error('Erro ao atualizar');
            resolve({ data: null, error: null });
          } catch (error) {
            reject({ data: null, error });
          }
        }
      })
    }),
    delete: () => ({
      eq: (coluna, valor) => ({
        then: async (resolve, reject) => {
          try {
            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/${tabela}?${coluna}=eq.${encodeURIComponent(valor)}`,
              {
                method: 'DELETE',
                headers: getHeaders()
              }
            );
            if (!response.ok) throw new Error('Erro ao deletar');
            resolve({ data: null, error: null });
          } catch (error) {
            reject({ data: null, error });
          }
        }
      })
    })
  }),
  storage
};