import {
    registerSchema,
    loginSchema,
    refreshTokenSchema
} from '../validators/authValidator.js';
import {
    createPostSchema,
    updatePostSchema,
    paginationSchema
} from '../validators/postValidator.js';

describe('Input Validation Tests', () => {

    describe('Registration Validation', () => {

        test('Should reject weak passwords (no uppercase)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'weakpass123!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('uppercase');
        });

        test('Should reject weak passwords (no special character)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'WeakPass123'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('special character');
        });

        test('Should reject weak passwords (too short)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Weak1!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least 8 characters');
        });

        test('Should reject weak passwords (no number)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'WeakPassword!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('number');
        });

        test('Should accept strong passwords', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'StrongPass123!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeUndefined();
        });

        test('Should reject invalid email formats', () => {
            const invalidEmails = [
                'notanemail',
                'missing@domain',
                '@nodomain.com',
                'spaces in@email.com',
                'double@@domain.com'
            ];

            invalidEmails.forEach(email => {
                const data = {
                    username: 'testuser',
                    email: email,
                    password: 'StrongPass123!'
                };
                const { error } = registerSchema.validate(data);

                expect(error).toBeDefined();
                expect(error.details[0].message).toContain('valid email');
            });
        });

        test('Should accept valid email formats', () => {
            const validEmails = [
                'user@example.com',
                'test.user@domain.co.uk',
                'user+tag@example.com',
                'user123@test-domain.com'
            ];

            validEmails.forEach(email => {
                const data = {
                    username: 'testuser',
                    email: email,
                    password: 'StrongPass123!'
                };
                const { error } = registerSchema.validate(data);

                expect(error).toBeUndefined();
            });
        });

        test('Should reject username with special characters', () => {
            const data = {
                username: 'test@user',
                email: 'test@example.com',
                password: 'StrongPass123!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('letters, numbers, and underscores');
        });

        test('Should reject username that is too short', () => {
            const data = {
                username: 'ab',
                email: 'test@example.com',
                password: 'StrongPass123!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least 3 characters');
        });

        test('Should reject username that is too long', () => {
            const data = {
                username: 'a'.repeat(31),
                email: 'test@example.com',
                password: 'StrongPass123!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('not exceed 30 characters');
        });

        test('Should reject missing required fields', () => {
            const data = {
                username: 'testuser'
                // Missing email and password
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details.length).toBeGreaterThan(0);
        });

        test('Should strip unknown fields (security)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'StrongPass123!',
                maliciousField: 'injected data',
                isAdmin: true
            };
            const { error, value } = registerSchema.validate(data, { stripUnknown: true });

            expect(error).toBeUndefined();
            expect(value.maliciousField).toBeUndefined();
            expect(value.isAdmin).toBeUndefined();
        });
    });

    describe('Login Validation', () => {

        test('Should reject invalid email', () => {
            const data = {
                email: 'not-an-email',
                password: 'anypassword'
            };
            const { error } = loginSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('valid email');
        });

        test('Should reject missing email', () => {
            const data = {
                password: 'anypassword'
            };
            const { error } = loginSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Email is required');
        });

        test('Should reject missing password', () => {
            const data = {
                email: 'test@example.com'
            };
            const { error } = loginSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Password is required');
        });

        test('Should accept valid login data', () => {
            const data = {
                email: 'test@example.com',
                password: 'anypassword'
            };
            const { error } = loginSchema.validate(data);

            expect(error).toBeUndefined();
        });
    });

    describe('Post Validation', () => {

        test('Should reject title that is too short', () => {
            const data = {
                title: 'Hi',
                content: 'This is valid content that is long enough'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least 3 characters');
        });

        test('Should reject title that is too long', () => {
            const data = {
                title: 'a'.repeat(201),
                content: 'This is valid content'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('not exceed 200 characters');
        });

        test('Should reject content that is too short', () => {
            const data = {
                title: 'Valid Title',
                content: 'Short'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least 10 characters');
        });

        test('Should reject content that is too long', () => {
            const data = {
                title: 'Valid Title',
                content: 'a'.repeat(10001)
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('not exceed 10000 characters');
        });

        test('Should accept valid post data', () => {
            const data = {
                title: 'This is a valid title',
                content: 'This is valid content that meets all requirements'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeUndefined();
        });

        test('Should reject missing title', () => {
            const data = {
                content: 'This is valid content'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Title is required');
        });

        test('Should reject missing content', () => {
            const data = {
                title: 'Valid Title'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Content is required');
        });
    });

    describe('Update Post Validation', () => {

        test('Should reject update with no fields', () => {
            const data = {};
            const { error } = updatePostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('At least one field');
        });

        test('Should accept update with only title', () => {
            const data = {
                title: 'Updated Title'
            };
            const { error } = updatePostSchema.validate(data);

            expect(error).toBeUndefined();
        });

        test('Should accept update with only content', () => {
            const data = {
                content: 'Updated content that is long enough'
            };
            const { error } = updatePostSchema.validate(data);

            expect(error).toBeUndefined();
        });

        test('Should accept update with both fields', () => {
            const data = {
                title: 'Updated Title',
                content: 'Updated content that is long enough'
            };
            const { error } = updatePostSchema.validate(data);

            expect(error).toBeUndefined();
        });
    });

    describe('Pagination Validation', () => {

        test('Should reject page less than 1', () => {
            const data = {
                page: 0,
                limit: 10
            };
            const { error } = paginationSchema.validate(data);

            expect(error).toBeDefined();
        });

        test('Should reject limit greater than 100', () => {
            const data = {
                page: 1,
                limit: 101
            };
            const { error } = paginationSchema.validate(data);

            expect(error).toBeDefined();
        });

        test('Should use default values when not provided', () => {
            const data = {};
            const { error, value } = paginationSchema.validate(data);

            expect(error).toBeUndefined();
            expect(value.page).toBe(1);
            expect(value.limit).toBe(10);
        });

        test('Should accept valid pagination', () => {
            const data = {
                page: 5,
                limit: 25
            };
            const { error } = paginationSchema.validate(data);

            expect(error).toBeUndefined();
        });
    });

    describe('Security - SQL Injection Prevention', () => {

        test('Should sanitize content with SQL injection patterns', () => {
            const data = {
                title: 'Normal Title',
                content: "'; DROP TABLE users; --"
            };
            const { error, value } = createPostSchema.validate(data);

            // Joi doesn't remove SQL - it validates length/type
            // The actual SQL prevention happens at the database layer (parameterized queries)
            expect(error).toBeUndefined();
            // Content is accepted but will be safely handled by Sequelize
            expect(value.content).toBe("'; DROP TABLE users; --");
        });
    });
});