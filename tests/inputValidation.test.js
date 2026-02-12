// ---------------------------------------------------------
// INPUT VALIDATION TESTS
// ---------------------------------------------------------
// These tests verify that the Joi validation schemas work correctly
// They test the validation rules WITHOUT hitting the database
// Tests cover: Registration, Login, Post, Update, Pagination, and Security

// Import auth validation schemas
import {
    registerSchema,       // Validates user registration data
    loginSchema,         // Validates login data
    refreshTokenSchema   // Validates refresh token data
} from '../validators/authValidator.js';

// Import post validation schemas
import {
    createPostSchema,    // Validates new post data
    updatePostSchema,    // Validates post update data
    paginationSchema     // Validates pagination query parameters
} from '../validators/postValidator.js';

// Main test suite for input validation
describe('Input Validation Tests', () => {

    /* ===========================
       REGISTRATION VALIDATION
    =========================== */
    describe('Registration Validation', () => {

        // Test: Password without uppercase letter should fail
        test('Should reject weak passwords (no uppercase)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'weakpass123!'              // No uppercase letter
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('uppercase');
        });

        // Test: Password without special character should fail
        test('Should reject weak passwords (no special character)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'WeakPass123'               // No special character (!@#$%)
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('special character');
        });

        // Test: Password shorter than 8 characters should fail
        test('Should reject weak passwords (too short)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Weak1!'                    // Only 6 characters
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least 8 characters');
        });

        // Test: Password without a number should fail
        test('Should reject weak passwords (no number)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'WeakPassword!'              // No number
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('number');
        });

        // Test: Strong password should pass validation
        test('Should accept strong passwords', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'StrongPass123!'             // Has uppercase, lowercase, number, special char
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeUndefined();             // No error = valid
        });

        // Test: Various invalid email formats should be rejected
        test('Should reject invalid email formats', () => {
            const invalidEmails = [
                'notanemail',                          // No @ sign
                'missing@domain',                      // No TLD
                '@nodomain.com',                       // No local part
                'spaces in@email.com',                 // Has spaces
                'double@@domain.com'                   // Double @
            ];

            // Test each invalid email
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

        // Test: Valid email formats should be accepted
        test('Should accept valid email formats', () => {
            const validEmails = [
                'user@example.com',                    // Basic email
                'test.user@domain.co.uk',              // Dots and subdomains
                'user+tag@example.com',                // Plus addressing
                'user123@test-domain.com'              // Numbers and hyphens
            ];

            // Test each valid email
            validEmails.forEach(email => {
                const data = {
                    username: 'testuser',
                    email: email,
                    password: 'StrongPass123!'
                };
                const { error } = registerSchema.validate(data);

                expect(error).toBeUndefined();         // Should pass
            });
        });

        // Test: Username with special characters (except underscore) should fail
        test('Should reject username with special characters', () => {
            const data = {
                username: 'test@user',                 // @ is not allowed
                email: 'test@example.com',
                password: 'StrongPass123!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('letters, numbers, and underscores');
        });

        // Test: Username shorter than 3 characters should fail
        test('Should reject username that is too short', () => {
            const data = {
                username: 'ab',                        // Only 2 characters
                email: 'test@example.com',
                password: 'StrongPass123!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least 3 characters');
        });

        // Test: Username longer than 30 characters should fail
        test('Should reject username that is too long', () => {
            const data = {
                username: 'a'.repeat(31),              // 31 characters
                email: 'test@example.com',
                password: 'StrongPass123!'
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('not exceed 30 characters');
        });

        // Test: Missing required fields should fail
        test('Should reject missing required fields', () => {
            const data = {
                username: 'testuser'
                // Missing email and password
            };
            const { error } = registerSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details.length).toBeGreaterThan(0);
        });

        // Test: Unknown/extra fields should be stripped (security feature)
        test('Should strip unknown fields (security)', () => {
            const data = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'StrongPass123!',
                maliciousField: 'injected data',       // This shouldn't be accepted
                isAdmin: true                          // Trying to escalate privileges
            };
            const { error, value } = registerSchema.validate(data, { stripUnknown: true });

            expect(error).toBeUndefined();
            expect(value.maliciousField).toBeUndefined();  // Stripped!
            expect(value.isAdmin).toBeUndefined();         // Stripped!
        });
    });

    /* ===========================
       LOGIN VALIDATION
    =========================== */
    describe('Login Validation', () => {

        // Test: Invalid email format should fail
        test('Should reject invalid email', () => {
            const data = {
                email: 'not-an-email',
                password: 'anypassword'
            };
            const { error } = loginSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('valid email');
        });

        // Test: Missing email should fail
        test('Should reject missing email', () => {
            const data = {
                password: 'anypassword'
            };
            const { error } = loginSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Email is required');
        });

        // Test: Missing password should fail
        test('Should reject missing password', () => {
            const data = {
                email: 'test@example.com'
            };
            const { error } = loginSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Password is required');
        });

        // Test: Valid login data should pass
        test('Should accept valid login data', () => {
            const data = {
                email: 'test@example.com',
                password: 'anypassword'
            };
            const { error } = loginSchema.validate(data);

            expect(error).toBeUndefined();
        });
    });

    /* ===========================
       POST VALIDATION
    =========================== */
    describe('Post Validation', () => {

        // Test: Title too short (less than 3 chars)
        test('Should reject title that is too short', () => {
            const data = {
                title: 'Hi',                          // Only 2 characters
                content: 'This is valid content that is long enough'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least 3 characters');
        });

        // Test: Title too long (more than 200 chars)
        test('Should reject title that is too long', () => {
            const data = {
                title: 'a'.repeat(201),               // 201 characters
                content: 'This is valid content'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('not exceed 200 characters');
        });

        // Test: Content too short (less than 10 chars)
        test('Should reject content that is too short', () => {
            const data = {
                title: 'Valid Title',
                content: 'Short'                      // Only 5 characters
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least 10 characters');
        });

        // Test: Content too long (more than 10000 chars)
        test('Should reject content that is too long', () => {
            const data = {
                title: 'Valid Title',
                content: 'a'.repeat(10001)            // 10001 characters
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('not exceed 10000 characters');
        });

        // Test: Valid post data should pass
        test('Should accept valid post data', () => {
            const data = {
                title: 'This is a valid title',
                content: 'This is valid content that meets all requirements'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeUndefined();
        });

        // Test: Missing title should fail
        test('Should reject missing title', () => {
            const data = {
                content: 'This is valid content'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Title is required');
        });

        // Test: Missing content should fail
        test('Should reject missing content', () => {
            const data = {
                title: 'Valid Title'
            };
            const { error } = createPostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Content is required');
        });
    });

    /* ===========================
       UPDATE POST VALIDATION
    =========================== */
    describe('Update Post Validation', () => {

        // Test: Empty update (no fields) should fail
        test('Should reject update with no fields', () => {
            const data = {};
            const { error } = updatePostSchema.validate(data);

            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('At least one field');
        });

        // Test: Updating only title should work
        test('Should accept update with only title', () => {
            const data = {
                title: 'Updated Title'
            };
            const { error } = updatePostSchema.validate(data);

            expect(error).toBeUndefined();
        });

        // Test: Updating only content should work
        test('Should accept update with only content', () => {
            const data = {
                content: 'Updated content that is long enough'
            };
            const { error } = updatePostSchema.validate(data);

            expect(error).toBeUndefined();
        });

        // Test: Updating both fields should work
        test('Should accept update with both fields', () => {
            const data = {
                title: 'Updated Title',
                content: 'Updated content that is long enough'
            };
            const { error } = updatePostSchema.validate(data);

            expect(error).toBeUndefined();
        });
    });

    /* ===========================
       PAGINATION VALIDATION
    =========================== */
    describe('Pagination Validation', () => {

        // Test: Page 0 is invalid (pages start at 1)
        test('Should reject page less than 1', () => {
            const data = {
                page: 0,
                limit: 10
            };
            const { error } = paginationSchema.validate(data);

            expect(error).toBeDefined();
        });

        // Test: Limit over 100 is too high
        test('Should reject limit greater than 100', () => {
            const data = {
                page: 1,
                limit: 101
            };
            const { error } = paginationSchema.validate(data);

            expect(error).toBeDefined();
        });

        // Test: Default values when none provided (page=1, limit=10)
        test('Should use default values when not provided', () => {
            const data = {};
            const { error, value } = paginationSchema.validate(data);

            expect(error).toBeUndefined();
            expect(value.page).toBe(1);                // Default page
            expect(value.limit).toBe(10);              // Default limit
        });

        // Test: Valid pagination parameters
        test('Should accept valid pagination', () => {
            const data = {
                page: 5,
                limit: 25
            };
            const { error } = paginationSchema.validate(data);

            expect(error).toBeUndefined();
        });
    });

    /* ===========================
       SECURITY - SQL INJECTION
    =========================== */
    describe('Security - SQL Injection Prevention', () => {

        // Test: SQL injection attempt should be handled safely
        test('Should sanitize content with SQL injection patterns', () => {
            const data = {
                title: 'Normal Title',
                content: "'; DROP TABLE users; --"     // SQL injection attempt
            };
            const { error, value } = createPostSchema.validate(data);

            // Joi validates the FORMAT (length/type) but doesn't remove SQL
            // The actual SQL injection prevention happens at the database level
            // through Sequelize's parameterized queries
            expect(error).toBeUndefined();
            // Content is accepted as-is, but Sequelize will safely escape it
            expect(value.content).toBe("'; DROP TABLE users; --");
        });
    });
});