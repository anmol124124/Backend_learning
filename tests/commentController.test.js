import request from 'supertest';
import express from 'express';
import commentRoutes from '../routes/commentRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import { User, Post, Comment } from '../models/associations.js';
import sequelize from '../config/db.js';
import redisClient from '../config/redis.js';
import bcrypt from 'bcrypt';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/comments', commentRoutes);

// Mock error handler
app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message
    });
});

describe('Comment Controller Integration Tests', () => {

    let testUser;
    let testPost;
    let accessToken;
    let csrfToken;

    // Setup: Create tables, user, and post before all tests
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await redisClient.connect().catch(() => { });

        // Create test user
        testUser = await User.create({
            username: 'commenttest',
            email: 'commenttest@example.com',
            password: await bcrypt.hash('Password123!', 10),
            role: 'user'
        });

        // Create test post
        testPost = await Post.create({
            title: 'Test Post for Comments',
            content: 'This post will have comments',
            userId: testUser.id
        });

        // Login to get tokens
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'commenttest@example.com',
                password: 'Password123!'
            });

        accessToken = loginResponse.body.data.accessToken;
        csrfToken = loginResponse.headers['x-csrf-token'];
    });

    // Cleanup: Clear comments after each test
    afterEach(async () => {
        await Comment.destroy({ where: {}, truncate: true, cascade: true });
    });

    // Teardown: Close connections after all tests
    afterAll(async () => {
        await Post.destroy({ where: {}, truncate: true });
        await User.destroy({ where: {}, truncate: true });
        await sequelize.close();
        await redisClient.quit().catch(() => { });
    });

    /* ===========================
       CREATE COMMENT TESTS
    =========================== */
    describe('POST /api/v1/comments', () => {

        test('Should create a comment successfully', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'This is a test comment'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Comment added successfully');
            expect(response.body.data.content).toBe(commentData.content);
            expect(response.body.data.postId).toBe(testPost.id);
            expect(response.body.data.userId).toBe(testUser.id);

            // Verify comment was created in database
            const comment = await Comment.findOne({
                where: { content: commentData.content }
            });
            expect(comment).toBeDefined();
            expect(comment.postId).toBe(testPost.id);
            expect(comment.userId).toBe(testUser.id);
        });

        test('Should reject comment creation without authentication', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'This is a test comment'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .send(commentData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        test('Should reject comment creation without CSRF token', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'This is a test comment'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                // No CSRF token
                .send(commentData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        test('Should reject comment on non-existent post', async () => {
            const commentData = {
                postId: 99999,
                content: 'This is a test comment'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Post not found');
        });

        test('Should reject comment with missing content', async () => {
            const commentData = {
                postId: testPost.id
                // Missing content
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('Should reject comment with missing postId', async () => {
            const commentData = {
                content: 'This is a test comment'
                // Missing postId
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('Should use transaction when creating comment', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'Transaction test comment'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify comment exists (transaction committed)
            const comment = await Comment.findOne({
                where: { content: commentData.content }
            });
            expect(comment).toBeDefined();
        });
    });

    /* ===========================
       CREATE NESTED REPLY TESTS
    =========================== */
    describe('POST /api/v1/comments (Nested Replies)', () => {

        let parentComment;

        beforeEach(async () => {
            // Create a parent comment
            parentComment = await Comment.create({
                content: 'This is a parent comment',
                userId: testUser.id,
                postId: testPost.id,
                parentCommentId: null
            });
        });

        test('Should create a reply to a comment', async () => {
            const replyData = {
                postId: testPost.id,
                content: 'This is a reply to the parent comment',
                parentCommentId: parentComment.id
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(replyData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.content).toBe(replyData.content);
            expect(response.body.data.parentCommentId).toBe(parentComment.id);

            // Verify reply was created in database
            const reply = await Comment.findOne({
                where: { content: replyData.content }
            });
            expect(reply).toBeDefined();
            expect(reply.parentCommentId).toBe(parentComment.id);
        });

        test('Should create nested reply (reply to a reply)', async () => {
            // Create first-level reply
            const firstReply = await Comment.create({
                content: 'First level reply',
                userId: testUser.id,
                postId: testPost.id,
                parentCommentId: parentComment.id
            });

            // Create second-level reply
            const secondReplyData = {
                postId: testPost.id,
                content: 'Second level reply',
                parentCommentId: firstReply.id
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(secondReplyData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.parentCommentId).toBe(firstReply.id);

            // Verify nested structure
            const secondReply = await Comment.findOne({
                where: { content: secondReplyData.content }
            });
            expect(secondReply.parentCommentId).toBe(firstReply.id);
        });

        test('Should set parentCommentId to null when not provided', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'Top-level comment'
                // No parentCommentId
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(200);

            expect(response.body.data.parentCommentId).toBeNull();

            // Verify in database
            const comment = await Comment.findOne({
                where: { content: commentData.content }
            });
            expect(comment.parentCommentId).toBeNull();
        });
    });

    /* ===========================
       GET POST COMMENTS TESTS
    =========================== */
    describe('GET /api/v1/comments/post/:postId', () => {

        beforeEach(async () => {
            // Create multiple comments for the test post
            await Comment.bulkCreate([
                {
                    content: 'First comment',
                    userId: testUser.id,
                    postId: testPost.id,
                    parentCommentId: null
                },
                {
                    content: 'Second comment',
                    userId: testUser.id,
                    postId: testPost.id,
                    parentCommentId: null
                },
                {
                    content: 'Third comment',
                    userId: testUser.id,
                    postId: testPost.id,
                    parentCommentId: null
                }
            ]);
        });

        test('Should get all comments for a post', async () => {
            const response = await request(app)
                .get(`/api/v1/comments/post/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('All comments fetched successfully');
            expect(response.body.data).toHaveLength(3);
            expect(response.body.data[0].content).toBeDefined();
            expect(response.body.data[0].postId).toBe(testPost.id);
        });

        test('Should return empty array for post with no comments', async () => {
            // Create a new post with no comments
            const newPost = await Post.create({
                title: 'Post with no comments',
                content: 'This post has no comments',
                userId: testUser.id
            });

            const response = await request(app)
                .get(`/api/v1/comments/post/${newPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);

            // Cleanup
            await newPost.destroy();
        });

        test('Should include nested replies in response', async () => {
            // Create parent comment
            const parentComment = await Comment.create({
                content: 'Parent comment with replies',
                userId: testUser.id,
                postId: testPost.id,
                parentCommentId: null
            });

            // Create replies
            await Comment.bulkCreate([
                {
                    content: 'Reply 1',
                    userId: testUser.id,
                    postId: testPost.id,
                    parentCommentId: parentComment.id
                },
                {
                    content: 'Reply 2',
                    userId: testUser.id,
                    postId: testPost.id,
                    parentCommentId: parentComment.id
                }
            ]);

            const response = await request(app)
                .get(`/api/v1/comments/post/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Find the parent comment in response
            const parentInResponse = response.body.data.find(
                c => c.content === 'Parent comment with replies'
            );

            expect(parentInResponse).toBeDefined();
            expect(parentInResponse.replies).toBeDefined();
            expect(parentInResponse.replies).toHaveLength(2);
        });

        test('Should handle deeply nested comment threads', async () => {
            // Create a deeply nested thread
            const level1 = await Comment.create({
                content: 'Level 1 comment',
                userId: testUser.id,
                postId: testPost.id,
                parentCommentId: null
            });

            const level2 = await Comment.create({
                content: 'Level 2 reply',
                userId: testUser.id,
                postId: testPost.id,
                parentCommentId: level1.id
            });

            const level3 = await Comment.create({
                content: 'Level 3 reply',
                userId: testUser.id,
                postId: testPost.id,
                parentCommentId: level2.id
            });

            const response = await request(app)
                .get(`/api/v1/comments/post/${testPost.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify all levels exist
            const allComments = await Comment.findAll({
                where: { postId: testPost.id }
            });

            expect(allComments.length).toBeGreaterThanOrEqual(6); // 3 from beforeEach + 3 new
        });
    });

    /* ===========================
       COMMENT AUTHORIZATION TESTS
    =========================== */
    describe('Comment Authorization', () => {

        test('Should only allow authenticated users to create comments', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'Unauthorized comment'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .send(commentData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        test('Should associate comment with logged-in user', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'User association test'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(200);

            expect(response.body.data.userId).toBe(testUser.id);

            // Verify in database
            const comment = await Comment.findOne({
                where: { content: commentData.content }
            });
            expect(comment.userId).toBe(testUser.id);
        });
    });

    /* ===========================
       COMMENT VALIDATION TESTS
    =========================== */
    describe('Comment Validation', () => {

        test('Should reject comment with empty content', async () => {
            const commentData = {
                postId: testPost.id,
                content: ''
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('Should reject comment with only whitespace', async () => {
            const commentData = {
                postId: testPost.id,
                content: '   '
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('Should accept valid comment content', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'This is a valid comment with proper content'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    /* ===========================
       TRANSACTION ROLLBACK TESTS
    =========================== */
    describe('Transaction Handling', () => {

        test('Should rollback transaction if comment creation fails', async () => {
            // This test verifies that if something goes wrong during comment creation,
            // the transaction is rolled back and no partial data is saved

            const initialCommentCount = await Comment.count();

            // Try to create comment with invalid data that might cause DB error
            try {
                await request(app)
                    .post('/api/v1/comments')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set('X-CSRF-Token', csrfToken)
                    .send({
                        postId: null, // Invalid postId
                        content: 'This should fail'
                    });
            } catch (error) {
                // Expected to fail
            }

            // Verify no comment was created
            const finalCommentCount = await Comment.count();
            expect(finalCommentCount).toBe(initialCommentCount);
        });
    });

    /* ===========================
       PERFORMANCE TESTS
    =========================== */
    describe('Performance Tests', () => {

        test('Should handle multiple comments efficiently', async () => {
            const startTime = Date.now();

            // Create 10 comments
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .post('/api/v1/comments')
                        .set('Authorization', `Bearer ${accessToken}`)
                        .set('X-CSRF-Token', csrfToken)
                        .send({
                            postId: testPost.id,
                            content: `Performance test comment ${i}`
                        })
                );
            }

            await Promise.all(promises);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete in reasonable time (adjust threshold as needed)
            expect(duration).toBeLessThan(5000); // 5 seconds

            // Verify all comments were created
            const comments = await Comment.findAll({
                where: { postId: testPost.id }
            });
            expect(comments.length).toBeGreaterThanOrEqual(10);
        });
    });
});
