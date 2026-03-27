import React, { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
        
        const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (res.ok) {
            if (isRegistering) {
                alert("Registration successful! Please login.");
                setIsRegistering(false);
            } else {
                localStorage.setItem('token', data.token); // Save session
                onLoginSuccess();
            }
        } else {
            alert(data.message || data.error);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: '#fff' }}>
            <h2>{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {isRegistering && (
                    <input type="text" placeholder="Username" required
                        onChange={(e) => setFormData({...formData, username: e.target.value})} />
                )}
                <input type="email" placeholder="Email" required
                    onChange={(e) => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder="Password" required
                    onChange={(e) => setFormData({...formData, password: e.target.value})} />
                
                <button type="submit" style={{ padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    {isRegistering ? 'Sign Up' : 'Login'}
                </button>
            </form>
            <p onClick={() => setIsRegistering(!isRegistering)} style={{ color: '#2563eb', cursor: 'pointer', marginTop: '15px', fontSize: '14px' }}>
                {isRegistering ? 'Already have an account? Login' : 'New here? Create an account'}
            </p>
        </div>
    );
};

export default Login;

const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // Save the token to stay logged in
            localStorage.setItem('token', data.token); 
            
            // This tells App.jsx to show the FileUpload component
            onLoginSuccess(); 
        } else {
            alert(data.message || data.error || "An error occurred");
        }
    } catch (error) {
        alert("Server is not responding. Is the backend running?");
    }
};