// ---------------------------------------------------------
// COMMENT CONTROLLER INTEGRATION TESTS
// ---------------------------------------------------------
// These tests verify that the comment system works correctly
// Tests cover: Creating comments, nested replies, authorization,
// validation, transactions, and performance

// Import supertest for making HTTP requests in tests
import request from 'supertest';
// Import express to create a test app
import express from 'express';
// Import routes we need to test
import commentRoutes from '../routes/commentRoutes.js';
import authRoutes from '../routes/authRoutes.js';
// Import models for database checks
import { User, Post, Comment } from '../models/associations.js';
// Import database and Redis connections
import sequelize from '../config/db.js';
import redisClient from '../config/redis.js';
// Import bcrypt for password hashing
import bcrypt from 'bcrypt';

// Create a test Express app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);           // Auth routes (for login)
app.use('/api/v1/comments', commentRoutes);    // Comment routes (what we're testing)

// Simple error handler for test app
app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message
    });
});

describe('Comment Controller Integration Tests', () => {

    let testUser;          // Test user that will create comments
    let testPost;          // Test post that comments will be attached to
    let accessToken;       // JWT token for authentication
    let csrfToken;         // CSRF token for mutation protection

    // Before ALL tests: set up database, user, post, and login
    beforeAll(async () => {
        await sequelize.sync({ force: true });         // Recreate tables
        await redisClient.connect().catch(() => { });   // Connect Redis

        // Create a test user
        testUser = await User.create({
            username: 'commenttest',
            email: 'commenttest@example.com',
            password: await bcrypt.hash('Password123!', 10),
            role: 'user'
        });

        // Create a test post that will receive comments
        testPost = await Post.create({
            title: 'Test Post for Comments',
            content: 'This post will have comments',
            userId: testUser.id
        });

        // Login to get authentication tokens
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'commenttest@example.com',
                password: 'Password123!'
            });

        accessToken = loginResponse.body.data.accessToken;
        csrfToken = loginResponse.headers['x-csrf-token'];
    });

    // After EACH test: clear comments so tests don't affect each other
    afterEach(async () => {
        await Comment.destroy({ where: {}, truncate: true, cascade: true });
    });

    // After ALL tests: clean up everything and close connections
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

        // Test: Create a basic comment successfully
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

            // Verify comment exists in database
            const comment = await Comment.findOne({
                where: { content: commentData.content }
            });
            expect(comment).toBeDefined();
            expect(comment.postId).toBe(testPost.id);
            expect(comment.userId).toBe(testUser.id);
        });

        // Test: Unauthenticated request should be rejected
        test('Should reject comment creation without authentication', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'This is a test comment'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .send(commentData)                     // No auth headers
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        // Test: Missing CSRF token should be rejected (prevents CSRF attacks)
        test('Should reject comment creation without CSRF token', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'This is a test comment'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                // No CSRF token!
                .send(commentData)
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        // Test: Comment on a post that doesn't exist should fail
        test('Should reject comment on non-existent post', async () => {
            const commentData = {
                postId: 99999,                         // This post doesn't exist
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

        // Test: Comment with no content should fail
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

        // Test: Comment with no postId should fail
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

        // Test: Verify that database transactions work
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

            // If transaction committed, comment should exist in DB
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

        // Before each test: create a parent comment to reply to
        beforeEach(async () => {
            parentComment = await Comment.create({
                content: 'This is a parent comment',
                userId: testUser.id,
                postId: testPost.id,
                parentCommentId: null                  // Top-level comment (no parent)
            });
        });

        // Test: Reply to an existing comment
        test('Should create a reply to a comment', async () => {
            const replyData = {
                postId: testPost.id,
                content: 'This is a reply to the parent comment',
                parentCommentId: parentComment.id      // This makes it a reply
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

            // Verify reply in database
            const reply = await Comment.findOne({
                where: { content: replyData.content }
            });
            expect(reply).toBeDefined();
            expect(reply.parentCommentId).toBe(parentComment.id);
        });

        // Test: Reply to a reply (deeply nested threads)
        test('Should create nested reply (reply to a reply)', async () => {
            // Create first-level reply
            const firstReply = await Comment.create({
                content: 'First level reply',
                userId: testUser.id,
                postId: testPost.id,
                parentCommentId: parentComment.id
            });

            // Create second-level reply (reply to the reply)
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

            // Verify the nested structure in database
            const secondReply = await Comment.findOne({
                where: { content: secondReplyData.content }
            });
            expect(secondReply.parentCommentId).toBe(firstReply.id);
        });

        // Test: Top-level comment should have null parentCommentId
        test('Should set parentCommentId to null when not provided', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'Top-level comment'
                // No parentCommentId = top-level comment
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

        // Before each test: create some test comments
        beforeEach(async () => {
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

        // Test: Get all comments for a specific post
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

        // Test: Post with no comments should return empty array
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

            await newPost.destroy();                   // Clean up
        });

        // Test: Response should include nested replies
        test('Should include nested replies in response', async () => {
            // Create parent comment with replies
            const parentComment = await Comment.create({
                content: 'Parent comment with replies',
                userId: testUser.id,
                postId: testPost.id,
                parentCommentId: null
            });

            // Create two replies to the parent
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

            // Find the parent comment and check its replies
            const parentInResponse = response.body.data.find(
                c => c.content === 'Parent comment with replies'
            );

            expect(parentInResponse).toBeDefined();
            expect(parentInResponse.replies).toBeDefined();
            expect(parentInResponse.replies).toHaveLength(2);
        });

        // Test: Deeply nested comment threads should work
        test('Should handle deeply nested comment threads', async () => {
            // Create a 3-level deep thread
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

            // Verify all comments exist
            const allComments = await Comment.findAll({
                where: { postId: testPost.id }
            });
            expect(allComments.length).toBeGreaterThanOrEqual(6);  // 3 from beforeEach + 3 nested
        });
    });

    /* ===========================
       COMMENT AUTHORIZATION TESTS
    =========================== */
    describe('Comment Authorization', () => {

        // Test: Only authenticated users can comment
        test('Should only allow authenticated users to create comments', async () => {
            const commentData = {
                postId: testPost.id,
                content: 'Unauthorized comment'
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .send(commentData)                     // No auth token
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        // Test: Comment should be linked to the logged-in user
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

            // The comment's userId should be the logged-in user's ID
            expect(response.body.data.userId).toBe(testUser.id);

            // Also verify in database
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

        // Test: Empty content should be rejected
        test('Should reject comment with empty content', async () => {
            const commentData = {
                postId: testPost.id,
                content: ''                            // Empty string
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        // Test: Whitespace-only content should be rejected
        test('Should reject comment with only whitespace', async () => {
            const commentData = {
                postId: testPost.id,
                content: '   '                         // Only spaces
            };

            const response = await request(app)
                .post('/api/v1/comments')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send(commentData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        // Test: Valid comment should be accepted
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

        // Test: If creation fails, no partial data should be saved
        test('Should rollback transaction if comment creation fails', async () => {
            const initialCommentCount = await Comment.count();

            // Try to create comment with invalid data
            try {
                await request(app)
                    .post('/api/v1/comments')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .set('X-CSRF-Token', csrfToken)
                    .send({
                        postId: null,                  // Invalid!
                        content: 'This should fail'
                    });
            } catch (error) {
                // Expected to fail
            }

            // No new comment should have been created
            const finalCommentCount = await Comment.count();
            expect(finalCommentCount).toBe(initialCommentCount);
        });
    });

    /* ===========================
       PERFORMANCE TESTS
    =========================== */
    describe('Performance Tests', () => {

        // Test: Creating multiple comments should be fast
        test('Should handle multiple comments efficiently', async () => {
            const startTime = Date.now();

            // Create 10 comments concurrently
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

            // All 10 comments should complete within 5 seconds
            expect(duration).toBeLessThan(5000);

            // Verify all comments were created
            const comments = await Comment.findAll({
                where: { postId: testPost.id }
            });
            expect(comments.length).toBeGreaterThanOrEqual(10);
        });
    });
});
