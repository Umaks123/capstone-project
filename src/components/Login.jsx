import React, { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
    // State to toggle between Login and Register views
    const [isRegistering, setIsRegistering] = useState(false);
    
    // State for form inputs
    const [formData, setFormData] = useState({ 
        username: '', 
        email: '', 
        password: '' 
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Requirements check: Construct the correct endpoint URL
        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
        const apiUrl = import.meta.env.VITE_API_URL;

        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok && (data.success || isRegistering)) {
                if (isRegistering) {
                    // Scenario: User just created an account
                    alert("✅ Registration successful! Please login now.");
                    setIsRegistering(false);
                } else {
                    // Scenario: User successfully logged in
                    localStorage.setItem('token', data.token); // Store JWT for session
                    onLoginSuccess(); // Tell App.jsx to show FileUpload
                }
            } else {
                // Backend sent an error message (e.g., "Invalid credentials")
                alert(data.message || data.error || "Authentication failed");
            }
        } catch (error) {
            console.error("Connection Error:", error);
            alert("❌ Server is not responding. Please check if the Backend/Load Balancer is active.");
        }
    };

    return (
        <div style={{ 
            maxWidth: '400px', 
            margin: '50px auto', 
            padding: '30px', 
            border: '1px solid #ddd', 
            borderRadius: '10px', 
            backgroundColor: '#fff',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
        }}>
            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>
                {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {isRegistering && (
                    <input 
                        type="text" 
                        placeholder="Username" 
                        required
                        style={inputStyle}
                        onChange={(e) => setFormData({...formData, username: e.target.value})} 
                    />
                )}
                
                <input 
                    type="email" 
                    placeholder="Email Address" 
                    required
                    style={inputStyle}
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                />
                
                <input 
                    type="password" 
                    placeholder="Password" 
                    required
                    style={inputStyle}
                    onChange={(e) => setFormData({...formData, password: e.target.value})} 
                />
                
                <button 
                    type="submit" 
                    style={{ 
                        padding: '12px', 
                        background: '#2563eb', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer',
                        fontWeight: 'bold' 
                    }}
                >
                    {isRegistering ? 'Sign Up' : 'Login'}
                </button>
            </form>

            <p 
                onClick={() => setIsRegistering(!isRegistering)} 
                style={{ color: '#2563eb', cursor: 'pointer', marginTop: '20px', fontSize: '14px', textAlign: 'center' }}
            >
                {isRegistering ? 'Already have an account? Login' : 'New here? Create an account'}
            </p>
        </div>
    );
};

// Simple reusable style for inputs
const inputStyle = {
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    fontSize: '16px'
};

export default Login;