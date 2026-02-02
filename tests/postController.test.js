import request from 'supertest';
import express from 'express';
import postRoutes from '../routes/postRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import { User, Post, Like } from '../models/associations.js';
import sequelize from '../config/db.js';
import redisClient from '../config/redis.js';
import bcrypt from 'bcrypt';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postRoutes);

// Mock error handler
app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message
    });
});

describe('Post Controller Integration Tests', () => {

    let testUser;
    let accessToken;
    let csrfToken;
    let refreshTokenCookie;

    // Setup: Create tables and test user before all tests
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await redisClient.connect().catch(() => { });

        // Create test user
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

    // Cleanup: Clear posts after each test
    afterEach(async () => {
        await Post.destroy({ where: {}, truncate: true, cascade: true });
        await Like.destroy({ where: {}, truncate: true });
        await redisClient.flushAll().catch(() => { });
    });

    // Teardown: Close connections after all tests
    afterAll(async () => {
        await User.destroy({ where: {}, truncate: true });
        await sequelize.close();
        await redisClient.quit().catch(() => { });
    });

    /* ===========================
       CREATE POST TESTS
    =========================== */
    describe('POST /api/v1/posts', () => {

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

            // Verify post was created in database
            const post = await Post.findOne({ where: { title: postData.title } });
            expect(post).toBeDefined();
            expect(post.userId).toBe(testUser.id);
        });

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

        test('Should clear Redis cache after creating post', async () => {
            // Set a cache value
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

            // Verify cache was cleared
            const cachedPosts = await redisClient.get('posts:all');
            expect(cachedPosts).toBeNull();
        });
    });

    /* ===========================
       GET ALL POSTS TESTS
    =========================== */
    describe('GET /api/v1/posts', () => {

        beforeEach(async () => {
            // Create test posts
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

        test('Should cache posts in Redis', async () => {
            // First request - should hit database
            await request(app)
                .get('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Verify posts are cached
            const cachedPosts = await redisClient.get('posts:all');
            expect(cachedPosts).toBeDefined();
            expect(JSON.parse(cachedPosts).data).toHaveLength(3);
        });

        test('Should return cached posts on second request', async () => {
            // First request
            await request(app)
                .get('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Second request - should use cache
            const response = await request(app)
                .get('/api/v1/posts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
        });

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

        beforeEach(async () => {
            testPost = await Post.create({
                title: 'Single Post Test',
                content: 'Content for single post test',
                userId: testUser.id
            });
        });

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

        test('Should return 404 for non-existent post', async () => {
            const response = await request(app)
                .get('/api/v1/posts/99999')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Post not found');
        });

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

        test('Should reject update by non-owner', async () => {
            // Create another user
            const otherUser = await User.create({
                username: 'otheruser',
                email: 'other@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            // Login as other user
            const otherLoginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'other@example.com',
                    password: 'Password123!'
                });

            const otherAccessToken = otherLoginResponse.body.data.accessToken;
            const otherCsrfToken = otherLoginResponse.headers['x-csrf-token'];

            // Try to update testUser's post
            const response = await request(app)
                .put(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${otherAccessToken}`)
                .set('X-CSRF-Token', otherCsrfToken)
                .send({ title: 'Hacked Title', content: 'Hacked content' })
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not authorized');

            // Cleanup
            await otherUser.destroy();
        });

        test('Should clear Redis cache after update', async () => {
            // Set cache
            await redisClient.set('posts:all', JSON.stringify([{ id: 1 }]));
            await redisClient.set(`posts:id:${testPost.id}`, JSON.stringify({ id: testPost.id }));

            await request(app)
                .put(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send({ title: 'Updated', content: 'Updated content' })
                .expect(200);

            // Verify cache was cleared
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

        test('Should delete post successfully', async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Post deleted successfully');

            // Verify post was deleted from database
            const deletedPost = await Post.findByPk(testPost.id);
            expect(deletedPost).toBeNull();
        });

        test('Should reject delete of non-existent post', async () => {
            const response = await request(app)
                .delete('/api/v1/posts/99999')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Post not found');
        });

        test('Should reject delete by non-owner', async () => {
            // Create another user
            const otherUser = await User.create({
                username: 'otheruser2',
                email: 'other2@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: 'user'
            });

            // Login as other user
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

            // Verify post still exists
            const post = await Post.findByPk(testPost.id);
            expect(post).toBeDefined();

            // Cleanup
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

            // Create a like
            await Like.create({
                userId: testUser.id,
                postId: testPost.id
            });
        });

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

        test('Should reject unlike when not liked', async () => {
            // Remove the like first
            await Like.destroy({
                where: {
                    userId: testUser.id,
                    postId: testPost.id
                }
            });

            // Try to unlike
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

        beforeEach(async () => {
            // Create posts for test user
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

        test('Should return empty array for user with no posts', async () => {
            // Create user with no posts
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

            // Cleanup
            await newUser.destroy();
        });
    });
});
