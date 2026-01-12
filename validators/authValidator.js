import Joi from 'joi';

// 1. Validation middleware wrapper - reusable function
export const validate = (schema) => {
    return (req, res, next) => {
        // Validates req.body against the schema
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,    // Show ALL errors, not just first one
            stripUnknown: true,   // Remove fields not in schema (security!)
        });

        if (error) {
            // Return formatted errors
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
            });
        }

        req.body = value; // Use sanitized data
        next();
    };
};

// 2. Schema for registration
export const registerSchema = Joi.object({
    username: Joi.string()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .required()
        .messages({
            'string.min': 'Username must be at least 3 characters long',
            'string.max': 'Username must not exceed 30 characters',
            'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
            'any.required': 'Username is required',
        }),

    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
        }),

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

    role: Joi.string()
        .valid('user', 'admin', 'superadmin')
        .optional()
        .messages({
            'any.only': 'Role must be one of: user, admin, superadmin',
        }),
});

// 3. Schema for login
export const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required',
        }),
});

// 4. Schema for refresh token
export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .messages({
            'any.required': 'Refresh token is required',
        }),
});