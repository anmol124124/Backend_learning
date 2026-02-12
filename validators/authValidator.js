// ---------------------------------------------------------
// AUTH VALIDATORS
// ---------------------------------------------------------
// These validation schemas check if auth request data is valid
// (registration, login, refresh token, forgot/reset password)

// Import Joi - a data validation library
import Joi from 'joi';

// ---------------------------------------------------------
// VALIDATE FUNCTION (Reusable Middleware)
// ---------------------------------------------------------
// Takes a Joi schema and returns middleware that validates req.body
export const validate = (schema) => {
    return (req, res, next) => {
        // Validate the request body against the schema
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,           // Show ALL errors, not just the first one
            stripUnknown: true,          // Remove any extra fields not in the schema (security!)
        });

        // If validation fails, return formatted error messages
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),       // Which field failed
                    message: detail.message,            // What went wrong
                })),
            });
        }

        req.body = value;                // Use the sanitized/validated data
        next();                          // Continue to the controller
    };
};

// ---------------------------------------------------------
// REGISTRATION SCHEMA
// ---------------------------------------------------------
// Validates data when a new user signs up
export const registerSchema = Joi.object({
    // Username: 3-30 chars, only letters, numbers, and underscores
    username: Joi.string()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_]+$/)     // Only alphanumeric + underscores allowed
        .required()
        .messages({
            'string.min': 'Username must be at least 3 characters long',
            'string.max': 'Username must not exceed 30 characters',
            'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
            'any.required': 'Username is required',
        }),

    // Email: must be a valid email format
    email: Joi.string()
        .email()                          // Must be valid email (e.g., user@example.com)
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
        }),

    // Password: 8-128 chars, must include uppercase, lowercase, number, and special char
    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.max': 'Password must not exceed 128 characters',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'any.required': 'Password is required',
        }),

    // Role: optional, defaults to "user" if not provided
    role: Joi.string()
        .valid('user', 'admin', 'superadmin')  // Only these roles are valid
        .optional()
        .messages({
            'any.only': 'Role must be one of: user, admin, superadmin',
        }),
});

// ---------------------------------------------------------
// LOGIN SCHEMA
// ---------------------------------------------------------
// Validates data when a user logs in
export const loginSchema = Joi.object({
    // Email: must be valid format
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
        }),

    // Password: just needs to be present (we don't validate strength on login)
    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required',
        }),
});

// ---------------------------------------------------------
// REFRESH TOKEN SCHEMA
// ---------------------------------------------------------
// Validates data when refreshing an access token
export const refreshTokenSchema = Joi.object({
    // The refresh token string must be provided
    refreshToken: Joi.string()
        .required()
        .messages({
            'any.required': 'Refresh token is required',
        }),
});

// ---------------------------------------------------------
// FORGOT PASSWORD SCHEMA
// ---------------------------------------------------------
// Validates data when user requests a password reset email
export const forgotPasswordSchema = Joi.object({
    // Only the email is needed
    email: Joi.string()
        .email()                                    // Must be valid email format
        .required()                                 // Cannot be empty
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        })
});

// ---------------------------------------------------------
// RESET PASSWORD SCHEMA
// ---------------------------------------------------------
// Validates data when user sets a new password using the reset token
export const resetPasswordSchema = Joi.object({
    // The reset token from the email URL
    token: Joi.string()
        .required()                                 // Token must be provided
        .min(10)                                    // Must be at least 10 characters
        .messages({
            'string.min': 'Invalid reset token',
            'any.required': 'Reset token is required'
        }),

    // The new password
    newPassword: Joi.string()
        .min(8)                                     // At least 8 characters
        .max(128)                                   // Maximum 128 characters
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/) // Must have lowercase, uppercase, and number
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.max': 'Password cannot exceed 128 characters',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            'any.required': 'New password is required'
        })
});