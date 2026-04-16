import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Configuração do Supabase
const SUPABASE_URL = 'https://tgnwbxcygmjipupufoix.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbndieGN5Z21qaXB1cHVmb2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDI4NDcsImV4cCI6MjA4NzE3ODg0N30.78BjN7G0a0lnUwXmveggL0GQD-Xp-5C7QYUBmfOIt_s';

const CriarConta = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: ''
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    if (mensagem.texto) {
      setMensagem({ texto: '', tipo: '' });
    }
  };

  // Função para criar conta no Supabase
  const criarConta = async (email, senha, nome) => {
    try {
      // 1. Criar o usuário na tabela usuarios
      const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          nome: nome,
          email: email,
          senha: senha,
          cargo: null,
          reputacao: 0,
          total_projetos: 0,
          localizacao: null
        })
      });

      if (!userResponse.ok) {
        const error = await userResponse.text();
        console.error('Erro ao criar usuário:', error);
        
        if (error.includes('duplicate key') || error.includes('email')) {
          throw new Error('Este e-mail já está cadastrado!');
        }
        throw new Error('Erro ao criar conta. Tente novamente.');
      }

      const usuarios = await userResponse.json();
      const usuarioCriado = usuarios[0];
      
      // ✅ REMOVIDO - não logar dados sensíveis
      // console.log('Usuário criado:', usuarioCriado);
      
      // Log seguro - apenas ID e nome
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Usuário criado com sucesso', { 
          id: usuarioCriado.id, 
          nome: usuarioCriado.nome 
        });
      }
      
      // 2. Criar o perfil do usuário na tabela perfil
      // const perfilResponse = await fetch(`${SUPABASE_URL}/rest/v1/perfil`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'apikey': SUPABASE_ANON_KEY,
      //     'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      //     'Prefer': 'return=representation'
      //   },
      //   body: JSON.stringify({
      //     id_usuarios: usuarioCriado.id,
      //     avatar_url: '/img/711769.png',
      //     sobre_mim: '',
      //     habilidades: []
      //   })
      // });
const perfilResponse = await fetch(`${SUPABASE_URL}/rest/v1/perfil`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    id_usuarios: usuarioCriado.id,
    avatar_url: '/img/711769.png'
    // Removido sobre_mim e habilidades
  })
});
      if (!perfilResponse.ok) {
        console.warn('Perfil não criado, mas usuário já existe');
      }
      
      return { success: true, usuario: usuarioCriado };
      
    } catch (error) {
      console.error('Erro na criação:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.senha) {
      setMensagem({
        texto: 'Preencha todos os campos.',
        tipo: 'erro'
      });
      return;
    }
    
    if (formData.senha.length < 6) {
      setMensagem({
        texto: 'A senha deve ter pelo menos 6 caracteres.',
        tipo: 'erro'
      });
      return;
    }
    
    setLoading(true);
    
    const resultado = await criarConta(formData.email, formData.senha, formData.nome);
    
    setLoading(false);
    
    if (resultado.success) {
      setMensagem({
        texto: '✅ Conta criada com sucesso! Redirecionando para login...',
        tipo: 'sucesso'
      });
      
      setFormData({
        nome: '',
        email: '',
        senha: ''
      });
      
      setTimeout(() => {
        navigate('/faca-login');
      }, 2000);
    } else {
      setMensagem({
        texto: `⚠️ ${resultado.error || 'Erro ao criar conta. Tente novamente.'}`,
        tipo: 'erro'
      });
    }
  };

  return (
    <div style={{
      backgroundColor: '#3f8fdb',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ color: '#333', textAlign: 'center', marginBottom: '30px' }}>
          Criar Conta
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#555' }}>
              Nome:
            </label>
            <input
              type="text"
              id="nome"
              value={formData.nome}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                transition: 'border-color 0.3s',
                outline: 'none'
              }}
              placeholder="Digite seu nome"
              required
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#555' }}>
              E-mail:
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                transition: 'border-color 0.3s',
                outline: 'none'
              }}
              placeholder="Digite seu e-mail"
              required
              disabled={loading}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#555' }}>
              Senha:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={mostrarSenha ? "text" : "password"}
                id="senha"
                value={formData.senha}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '40px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s',
                  outline: 'none'
                }}
                placeholder="Digite sua senha (mínimo 6 caracteres)"
                required
                disabled={loading}
              />
              <span
                onClick={() => !loading && setMostrarSenha(!mostrarSenha)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '18px',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {mostrarSenha ? '👁️‍🗨️' : '👁️‍🗨️'}
              </span>
            </div>
          </div>
          
          {mensagem.texto && (
            <div style={{
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              backgroundColor: mensagem.tipo === 'sucesso' ? '#d4edda' : '#f8d7da',
              color: mensagem.tipo === 'sucesso' ? '#155724' : '#721c24',
              textAlign: 'center',
              border: `1px solid ${mensagem.tipo === 'sucesso' ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {mensagem.texto}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#a0c0e0' : '#3f8fdb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#2a6fb0')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3f8fdb')}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTop: '3px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '10px',
                  verticalAlign: 'middle'
                }}></span>
                Criando conta...
              </>
            ) : 'Criar Conta'}
          </button>
          
          <div style={{ textAlign: 'center' }}>
            <Link 
              to="/faca-login" 
              style={{
                color: '#3f8fdb',
                textDecoration: 'none',
                fontSize: '15px',
                transition: 'color 0.3s',
                display: 'inline-block',
                marginBottom: '10px'
              }}
              onMouseEnter={(e) => e.target.style.color = '#2a6fb0'}
              onMouseLeave={(e) => e.target.style.color = '#3f8fdb'}
            >
              Já tem uma conta? <strong>Fazer login</strong>
            </Link>
            <br />
            <Link 
              to="/" 
              style={{
                color: '#777',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'color 0.3s',
                display: 'inline-block'
              }}
              onMouseEnter={(e) => e.target.style.color = '#555'}
              onMouseLeave={(e) => e.target.style.color = '#777'}
            >
              ← Voltar para Home
            </Link>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CriarConta;