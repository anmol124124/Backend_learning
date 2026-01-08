import React, { useState } from 'react';
import axios from 'axios';

const Profile = ({ token, csrfToken, onLogout }) => {
    const [profileData, setProfileData] = useState(null);
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
        <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center' }}>
            <h2>User Dashboard</h2>
            <button
                onClick={fetchProfile}
                style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}
            >
                Profile
            </button>

            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {profileData && (
                <div style={{ textAlign: 'left', marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <h3>Profile Details</h3>
                    <pre>{JSON.stringify(profileData, null, 2)}</pre>
                </div>
            )}

            <div style={{ marginTop: '20px' }}>
                <button
                    onClick={handleLogout}
                    style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Profile;
