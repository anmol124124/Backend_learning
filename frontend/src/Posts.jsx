import React, { useState, useEffect } from 'react';

const Posts = ({ token }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    // This is "fetching the API" - using fetch() to get data from your backend
    const fetchPosts = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/v1/posts');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            console.log('Fetched result:', result);

            // Handle both wrapped response {success, message, data: [...]} and direct array
            let postsData = [];

            if (Array.isArray(result)) {
                // Direct array response (weird React StrictMode behavior)
                postsData = result;
            } else if (result.data && Array.isArray(result.data)) {
                // Normal wrapped response
                postsData = result.data;
            }

            console.log('Setting posts:', postsData);
            console.log('Posts count:', postsData.length);

            setPosts(postsData);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
            console.error('Error fetching posts:', err);
        }
    };

    // Like a post
    const handleLike = async (postId) => {
        if (!token) {
            alert('Please login to like posts!');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/v1/posts/${postId}/toggle-like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || 'Failed to like post');
                return;
            }

            alert('✅ Post liked successfully!');
            fetchPosts(); // Refresh posts
        } catch (err) {
            console.error('Error liking post:', err);
            alert('Failed to like post');
        }
    };

    // Unlike a post
    const handleUnlike = async (postId) => {
        if (!token) {
            alert('Please login to unlike posts!');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/v1/posts/${postId}/toggle-unlike`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || 'Failed to unlike post');
                return;
            }

            alert('✅ Post unliked successfully!');
            fetchPosts(); // Refresh posts
        } catch (err) {
            console.error('Error unliking post:', err);
            alert('Failed to unlike post');
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                    fontSize: '18px',
                    color: '#666',
                    animation: 'pulse 1.5s ease-in-out infinite'
                }}>
                    ⏳ Loading posts...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#dc3545',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                margin: '20px'
            }}>
                <h3>❌ Error Loading Posts</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6c757d'
            }}>
                <h3>📭 No Posts Yet</h3>
                <p>Be the first to create a post!</p>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '20px'
        }}>
            <h1 style={{
                textAlign: 'center',
                marginBottom: '30px',
                color: '#333',
                fontSize: '32px'
            }}>
                📝 All Posts
            </h1>

            <div style={{
                display: 'grid',
                gap: '20px'
            }}>
                {posts.map(post => (
                    <div
                        key={post.id}
                        style={{
                            border: '1px solid #e0e0e0',
                            borderRadius: '12px',
                            padding: '20px',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                    >
                        <h2 style={{
                            margin: '0 0 12px 0',
                            color: '#007bff',
                            fontSize: '24px'
                        }}>
                            {post.title}
                        </h2>

                        <p style={{
                            color: '#555',
                            lineHeight: '1.6',
                            fontSize: '16px',
                            margin: '0 0 16px 0'
                        }}>
                            {post.content}
                        </p>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid #f0f0f0',
                            paddingTop: '12px',
                            marginTop: '12px'
                        }}>
                            <div style={{
                                fontSize: '14px',
                                color: '#6c757d',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{
                                    backgroundColor: '#e7f3ff',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    color: '#0056b3',
                                    fontWeight: '500'
                                }}>
                                    👤 {post.User?.username || 'Unknown User'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLike(post.id);
                                    }}
                                    style={{
                                        padding: '6px 16px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                                >
                                    👍 Like
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnlike(post.id);
                                    }}
                                    style={{
                                        padding: '6px 16px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                                >
                                    👎 Unlike
                                </button>

                                <div style={{
                                    fontSize: '12px',
                                    color: '#999',
                                    marginLeft: 'auto'
                                }}>
                                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                textAlign: 'center',
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                color: '#6c757d'
            }}>
                <p style={{ margin: 0 }}>
                    📊 Showing <strong>{posts.length}</strong> post{posts.length !== 1 ? 's' : ''}
                </p>
            </div>
        </div>
    );
};

export default Posts;
