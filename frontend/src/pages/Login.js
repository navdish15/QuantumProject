import React, { useState } from 'react';
import api from '../api';
import './Login.css';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
      });

      if (res.data.message === 'Login successful') {
        const { token, user } = res.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        if (user.role === 'admin') {
          navigate('/admin-dashboard');
        } else if (user.role === 'user') {
          navigate('/user-dashboard');
        } else {
          alert('Unknown role — cannot redirect.');
        }
      } else {
        alert('Invalid login');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    }
  };

  return (
    <>
      <div className="login-page">
        <div className="left-title">
          <h1>Quantum Neuton</h1>
        </div>

        <div className="glass-card">
          <h2>Login</h2>

          <form onSubmit={handleLogin}>
            <div className="input-box">
              <i className="fa fa-user"></i>
              <input type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="input-box">
              <i className="fa fa-lock"></i>
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button className="login-btn">Login</button>
          </form>
        </div>
      </div>

      <footer className="login-footer">© {new Date().getFullYear()} Quantum Neuton. All Rights Reserved.</footer>
    </>
  );
};

export default Login;
