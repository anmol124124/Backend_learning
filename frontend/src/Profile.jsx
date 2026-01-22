import React, { useState } from 'react';
import axios from 'axios';
import Posts from './Posts';

const Profile = ({ token, csrfToken, onLogout }) => {
    const [profileData, setProfileData] = useState(null);
    const [showPosts, setShowPosts] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchProfile = async () => {
        setError('');
        setSuccessMessage('');
        try {
            const response = await axios.get('http://localhost:3000/api/v1/auth/profile', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'x-csrf-token': csrfToken,
                },
            });
            setProfileData(response.data);
            setSuccessMessage('Profile fetched successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch profile');
        }
    };

    const handleLogout = async () => {
        try {
            await axios.post('http://localhost:3000/api/v1/auth/logout', {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                withCredentials: true // Important for cookies
            });
        } catch (err) {
            console.error('Logout failed', err);
        } finally {
            onLogout();
        }
    };

    return (
        <>
            <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center' }}>
                <h2>User Dashboard</h2>

                {/* Button Group */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                    <button
                        onClick={fetchProfile}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        📋 Profile
                    </button>

                    <button
                        onClick={() => {
                            setShowPosts(!showPosts);
                            setProfileData(null); // Clear profile when showing posts
                            setError('');
                            setSuccessMessage('');
                        }}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: showPosts ? '#6c757d' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        {showPosts ? '❌ Close Posts' : '📝 Posts'}
                    </button>

                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        🚪 Logout
                    </button>
                </div>

                {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {profileData && (
                    <div style={{ textAlign: 'left', marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                        <h3>Profile Details</h3>
                        <pre>{JSON.stringify(profileData, null, 2)}</pre>
                    </div>
                )}
            </div>

            {/* Posts Section - Only shown when showPosts is true */}
            {showPosts && (
                <div style={{ marginTop: '30px' }}>
                    <Posts token={token} />
                </div>
            )}
        </>
    );
};

export default Profile;
