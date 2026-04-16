import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fazerLogin } from '../services/auth';

const FacaLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
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
    // Limpar mensagem quando o usuário digitar
    if (mensagem.texto) {
      setMensagem({ texto: '', tipo: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.email || !formData.senha) {
      setMensagem({
        texto: 'Preencha todos os campos.',
        tipo: 'erro'
      });
      return;
    }

    setLoading(true);
    
    // Fazer login com o Supabase
    const resultado = await fazerLogin(formData.email, formData.senha);
    
    setLoading(false);
    
    // ✅ CORREÇÃO: era "sucesso" e agora é "success"
    if (resultado.success) {
      setMensagem({
        texto: 'Login realizado com sucesso! Redirecionando...',
        tipo: 'sucesso'
      });
      
      // Redirecionar para a área de trabalho após 1.5 segundos
      setTimeout(() => {
        navigate('/aria-trabalho');
      }, 1500);
    } else {
      setMensagem({
        texto: resultado.error || 'E-mail ou senha incorretos',
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
          Fazer Login
        </h1>
        
        <form onSubmit={handleSubmit}>
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
                placeholder="Digite sua senha"
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
              border: `1px solid ${mensagem.tipo === 'sucesso' ? '#c3e6cb' : '#f5c6cb'}`,
              animation: 'fadeIn 0.3s ease'
            }}>
              {mensagem.tipo === 'erro' && (
                <span style={{ marginRight: '8px' }}>⚠️</span>
              )}
              {mensagem.tipo === 'sucesso' && (
                <span style={{ marginRight: '8px' }}>✅</span>
              )}
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
              position: 'relative',
              overflow: 'hidden'
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
                Entrando...
              </>
            ) : 'Entrar'}
          </button>
          
          <div style={{ textAlign: 'center' }}>
            <Link 
              to="/criar-conta" 
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
              Não tem uma conta? <strong>Criar conta</strong>
            </Link>
            <br />
            <Link 
              to="/" 
              style={{
                color: '#777',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'color 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#555'}
              onMouseLeave={(e) => e.target.style.color = '#777'}
            >
              ← Voltar para Home
            </Link>
          </div>
        </form>
      </div>

      {/* Estilos para animações */}
      {/* <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style> */}
    </div>
  );
};

export default FacaLogin;