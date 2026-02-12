// ---------------------------------------------------------
// POST CONTROLLER INTEGRATION TESTS
// ---------------------------------------------------------
// These tests verify that the post CRUD system works correctly
// Tests cover: Creating, reading, updating, deleting posts,
// liking/unliking posts, caching, and authorization

// Import supertest for making HTTP requests in tests
import request from 'supertest';
// Import express to create a test app
import express from 'express';
// Import routes
import postRoutes from '../routes/postRoutes.js';
import authRoutes from '../routes/authRoutes.js';
// Import models for database verification
import { User, Post, Like } from '../models/associations.js';
// Import database and Redis
import sequelize from '../config/db.js';
import redisClient from '../config/redis.js';
// Import bcrypt for password hashing
import bcrypt from 'bcrypt';

// Create test Express app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);           // Auth routes (for login)
app.use('/api/v1/posts', postRoutes);          // Post routes (what we're testing)

// Simple error handler for test app
app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message
    });
});

describe('Post Controller Integration Tests', () => {

    let testUser;              // User who creates/owns posts
    let accessToken;           // JWT for authentication
    let csrfToken;             // CSRF token for mutation requests
    let refreshTokenCookie;    // Cookie containing refresh token

    // Before ALL tests: set up database and create test user
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await redisClient.connect().catch(() => { });

        // Create a test user
        testUser = await User.create({
            username: 'posttest',
            email: 'posttest@example.com',
            password: await bcrypt.hash('Password123!', 10),
            role: 'user'
        });

        // Login to get tokens
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'posttest@example.com',
                password: 'Password123!'
            });

        accessToken = loginResponse.body.data.accessToken;
        csrfToken = loginResponse.headers['x-csrf-token'];
        refreshTokenCookie = loginResponse.headers['set-cookie'];
    });

    // After EACH test: clean up posts, likes, and cache
    afterEach(async () => {
        await Post.destroy({ where: {}, truncate: true, cascade: true });
        await Like.destroy({ where: {}, truncate: true });
        await redisClient.flushAll().catch(() => { });     // Clear Redis cache
    });

    // After ALL tests: close connections
    afterAll(async () => {
        await User.destroy({ where: {}, truncate: true });
        await sequelize.close();
        await redisClient.quit().catch(() => { });
    });

    /* ===========================
       CREATE POST TESTS
    =========================== */
    describe('POST /api/v1/posts', () => {

        // Test: Create a new post successfully
        test('Should create a new post successfully', async () => {
            const postData = {
                title: 'Test Post Title',
                content: 'This is the content of the test post. It needs to be at least 10 characters long.'
            };

            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(postData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Post created successfully');
            expect(response.body.data.title).toBe(postData.title);
            expect(response.body.data.content).toBe(postData.content);
            expect(response.body.data.userId).toBe(testUser.id);

            // Verify post exists in database
            const post = await Post.findOne({ where: { title: postData.title } });
            expect(post).toBeDefined();
            expect(post.userId).toBe(testUser.id);
        });

        // Test: No auth token = 401 Unauthorized
        test('Should reject post creation without authentication', async () => {
            const postData = {
                title: 'Test Post',
                content: 'This is test content'
            };

            const response = await request(app)
                .post('/api/v1/posts')
                .send(postData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        // Test: No CSRF token = 403 Forbidden
        test('Should reject post creation without CSRF token', async () => {
            const postData = {
                title: 'Test Post',
                content: 'This is test content'
            };

            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                // No CSRF token
                .send(postData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        // Test: Missing title should fail validation
        test('Should reject post with missing title', async () => {
            const postData = {
                content: 'This is test content'
                // Missing title
            };

            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(postData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        // Test: Missing content should fail validation
        test('Should reject post with missing content', async () => {
            const postData = {
                title: 'Test Post'
                // Missing content
            };

            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(postData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        // Test: Creating a post should invalidate the Redis cache
        test('Should clear Redis cache after creating post', async () => {
            // Manually populate cache
            await redisClient.set('posts:all', JSON.stringify([{ id: 1 }]));

            const postData = {
                title: 'Test Post',
                content: 'This is test content'
            };

            await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(postData)
                .expect(200);

            // Cache should now be empty (invalidated)
            const cachedPosts = await redisClient.get('posts:all');
            expect(cachedPosts).toBeNull();
        });
    });

    /* ===========================
       GET ALL POSTS TESTS
    =========================== */
    describe('GET /api/v1/posts', () => {

        // Before each test: create 3 test posts
        beforeEach(async () => {
            await Post.bulkCreate([
                {
                    title: 'Post 1',
                    content: 'Content for post 1',
                    userId: testUser.id
                },
                {
                    title: 'Post 2',
                    content: 'Content for post 2',
                    userId: testUser.id
                },
                {
                    title: 'Post 3',
                    content: 'Content for post 3',
                    userId: testUser.id
                }
            ]);
        });

        // Test: Get all posts
        test('Should get all posts successfully', async () => {
            const response = await request(app)
                .get('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            expect(response.body.data[0].title).toBeDefined();
            expect(response.body.data[0].content).toBeDefined();
        });

        // Test: Posts should be cached in Redis after first fetch
        test('Should cache posts in Redis', async () => {
            // First request - hits database
            await request(app)
                .get('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Verify data is now in Redis cache
            const cachedPosts = await redisClient.get('posts:all');
            expect(cachedPosts).toBeDefined();
            expect(JSON.parse(cachedPosts).data).toHaveLength(3);
        });

        // Test: Second request should use cached data
        test('Should return cached posts on second request', async () => {
            // First request (populates cache)
            await request(app)
                .get('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Second request (should use cache)
            const response = await request(app)
                .get('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
        });

        // Test: Posts should include user info (username, etc.)
        test('Should include user information in posts', async () => {
            const response = await request(app)
                .get('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.data[0].User).toBeDefined();
            expect(response.body.data[0].User.username).toBe(testUser.username);
        });
    });

    /* ===========================
       GET SINGLE POST TESTS
    =========================== */
    describe('GET /api/v1/posts/:id', () => {

        let testPost;

        // Before each test: create a single test post
        beforeEach(async () => {
            testPost = await Post.create({
                title: 'Single Post Test',
                content: 'Content for single post test',
                userId: testUser.id
            });
        });

        // Test: Get a specific post by its ID
        test('Should get single post by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(testPost.id);
            expect(response.body.data.title).toBe(testPost.title);
            expect(response.body.data.content).toBe(testPost.content);
        });

        // Test: Non-existent post should return 404
        test('Should return 404 for non-existent post', async () => {
            const response = await request(app)
                .get('/api/v1/posts/99999')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Post not found');
        });

        // Test: Single post should be cached
        test('Should cache single post in Redis', async () => {
            await request(app)
                .get(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Verify post is cached
            const cachedPost = await redisClient.get(`posts:id:${testPost.id}`);
            expect(cachedPost).toBeDefined();
            expect(JSON.parse(cachedPost).data.id).toBe(testPost.id);
        });
    });

    /* ===========================
       UPDATE POST TESTS
    =========================== */
    describe('PUT /api/v1/posts/:id', () => {

        let testPost;

        beforeEach(async () => {
            testPost = await Post.create({
                title: 'Original Title',
                content: 'Original content',
                userId: testUser.id
            });
        });

        // Test: Owner can update their post
        test('Should update post successfully', async () => {
            const updateData = {
                title: 'Updated Title',
                content: 'Updated content'
            };

            const response = await request(app)
                .put(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Post updated successfully');
            expect(response.body.data.title).toBe(updateData.title);
            expect(response.body.data.content).toBe(updateData.content);

            // Verify database was updated
            const updatedPost = await Post.findByPk(testPost.id);
            expect(updatedPost.title).toBe(updateData.title);
            expect(updatedPost.content).toBe(updateData.content);
        });

        // Test: Can't update a post that doesn't exist
        test('Should reject update of non-existent post', async () => {
            const response = await request(app)
                .put('/api/v1/posts/99999')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send({ title: 'Updated Title', content: 'Updated content' })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Post not found');
        });

        // Test: Only the post owner can update it
        test('Should reject update by non-owner', async () => {
            // Create another user
            const otherUser = await User.create({
                username: 'otheruser',
                email: 'other@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            // Login as the other user
            const otherLoginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'other@example.com',
                    password: 'Password123!'
                });

            const otherAccessToken = otherLoginResponse.body.data.accessToken;
            const otherCsrfToken = otherLoginResponse.headers['x-csrf-token'];

            // Try to update someone else's post
            const response = await request(app)
                .put(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${otherAccessToken}`)
                .set('X-CSRF-Token', otherCsrfToken)
                .send({ title: 'Hacked Title', content: 'Hacked content' })
                .expect(403);                          // 403 Forbidden

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not authorized');

            await otherUser.destroy();
        });

        // Test: Updating a post should clear the cache
        test('Should clear Redis cache after update', async () => {
            // Set up cache entries
            await redisClient.set('posts:all', JSON.stringify([{ id: 1 }]));
            await redisClient.set(`posts:id:${testPost.id}`, JSON.stringify({ id: testPost.id }));

            await request(app)
                .put(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send({ title: 'Updated', content: 'Updated content' })
                .expect(200);

            // Both cache entries should be cleared
            const cachedPosts = await redisClient.get('posts:all');
            const cachedPost = await redisClient.get(`posts:id:${testPost.id}`);
            expect(cachedPosts).toBeNull();
            expect(cachedPost).toBeNull();
        });
    });

    /* ===========================
       DELETE POST TESTS
    =========================== */
    describe('DELETE /api/v1/posts/:id', () => {

        let testPost;

        beforeEach(async () => {
            testPost = await Post.create({
                title: 'Post to Delete',
                content: 'This post will be deleted',
                userId: testUser.id
            });
        });

        // Test: Owner can delete their post
        test('Should delete post successfully', async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Post deleted successfully');

            // Verify post no longer exists
            const deletedPost = await Post.findByPk(testPost.id);
            expect(deletedPost).toBeNull();
        });

        // Test: Can't delete a post that doesn't exist
        test('Should reject delete of non-existent post', async () => {
            const response = await request(app)
                .delete('/api/v1/posts/99999')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Post not found');
        });

        // Test: Non-owner can't delete someone else's post
        test('Should reject delete by non-owner', async () => {
            // Create another user
            const otherUser = await User.create({
                username: 'otheruser2',
                email: 'other2@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            // Login as the other user
            const otherLoginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'other2@example.com',
                    password: 'Password123!'
                });

            const otherAccessToken = otherLoginResponse.body.data.accessToken;
            const otherCsrfToken = otherLoginResponse.headers['x-csrf-token'];

            // Try to delete testUser's post
            const response = await request(app)
                .delete(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${otherAccessToken}`)
                .set('X-CSRF-Token', otherCsrfToken)
                .expect(403);

            expect(response.body.success).toBe(false);

            // Post should still exist
            const post = await Post.findByPk(testPost.id);
            expect(post).toBeDefined();

            await otherUser.destroy();
        });
    });

    /* ===========================
       LIKE POST TESTS
    =========================== */
    describe('POST /api/v1/posts/:id/like', () => {

        let testPost;

        beforeEach(async () => {
            testPost = await Post.create({
                title: 'Post to Like',
                content: 'This post will be liked',
                userId: testUser.id
            });
        });

        // Test: User can like a post
        test('Should like post successfully', async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${testPost.id}/like`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Post liked successfully');

            // Verify like was created in database
            const like = await Like.findOne({
                where: {
                    userId: testUser.id,
                    postId: testPost.id
                }
            });
            expect(like).toBeDefined();
        });

        // Test: Can't like the same post twice
        test('Should reject duplicate like', async () => {
            // Like once
            await Like.create({
                userId: testUser.id,
                postId: testPost.id
            });

            // Try to like again
            const response = await request(app)
                .post(`/api/v1/posts/${testPost.id}/like`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already liked');
        });

        // Test: Can't like a post that doesn't exist
        test('Should reject like on non-existent post', async () => {
            const response = await request(app)
                .post('/api/v1/posts/99999/like')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Post not found');
        });
    });

    /* ===========================
       UNLIKE POST TESTS
    =========================== */
    describe('DELETE /api/v1/posts/:id/like', () => {

        let testPost;

        beforeEach(async () => {
            testPost = await Post.create({
                title: 'Post to Unlike',
                content: 'This post will be unliked',
                userId: testUser.id
            });

            // Create a like that we'll remove
            await Like.create({
                userId: testUser.id,
                postId: testPost.id
            });
        });

        // Test: User can unlike a previously liked post
        test('Should unlike post successfully', async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${testPost.id}/like`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Post unliked successfully');

            // Verify like was removed from database
            const like = await Like.findOne({
                where: {
                    userId: testUser.id,
                    postId: testPost.id
                }
            });
            expect(like).toBeNull();
        });

        // Test: Can't unlike a post you haven't liked
        test('Should reject unlike when not liked', async () => {
            // Remove the like first
            await Like.destroy({
                where: {
                    userId: testUser.id,
                    postId: testPost.id
                }
            });

            // Try to unlike (there's no like to remove)
            const response = await request(app)
                .delete(`/api/v1/posts/${testPost.id}/like`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not liked');
        });
    });

    /* ===========================
       GET USER POSTS TESTS
    =========================== */
    describe('GET /api/v1/posts/user/:userId', () => {

        // Before each test: create posts for the test user
        beforeEach(async () => {
            await Post.bulkCreate([
                {
                    title: 'User Post 1',
                    content: 'Content 1',
                    userId: testUser.id
                },
                {
                    title: 'User Post 2',
                    content: 'Content 2',
                    userId: testUser.id
                }
            ]);
        });

        // Test: Get all posts by a specific user
        test('Should get all posts by specific user', async () => {
            const response = await request(app)
                .get(`/api/v1/posts/user/${testUser.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0].userId).toBe(testUser.id);
            expect(response.body.data[1].userId).toBe(testUser.id);
        });

        // Test: User with no posts should return empty array
        test('Should return empty array for user with no posts', async () => {
            // Create a user who has no posts
            const newUser = await User.create({
                username: 'nopostuser',
                email: 'nopost@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            const response = await request(app)
                .get(`/api/v1/posts/user/${newUser.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);

            await newUser.destroy();
        });
    });
});
