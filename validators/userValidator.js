// ---------------------------------------------------------
// USER VALIDATORS
// ---------------------------------------------------------
// These validation schemas check if user profile data is valid
// Used for profile updates and password changes

// Import Joi validation library
import Joi from 'joi';

// ---------------------------------------------------------
// VALIDATE FUNCTION (Reusable Middleware)
// ---------------------------------------------------------
export const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,           // Show all errors at once
            stripUnknown: true,          // Remove unknown fields
        });

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
            });
        }

        req.body = value;                // Use validated data
        next();                          // Continue to controller
    };
};

// ---------------------------------------------------------
// UPDATE PROFILE SCHEMA
// ---------------------------------------------------------
// Validates data when a user updates their profile
// At least one field must be provided
export const updateProfileSchema = Joi.object({
    // Username: 3-50 characters, optional on update
    username: Joi.string()
        .min(3)
        .max(50)
        .optional()
        .messages({
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username must not exceed 50 characters',
        }),

    // Bio: up to 500 characters, can be empty
    bio: Joi.string()
        .max(500)
        .allow('')                        // Allow empty string (to clear bio)
        .optional()
        .messages({
            'string.max': 'Bio must not exceed 500 characters',
        }),

    // Avatar: must be a valid URL if provided
    avatar: Joi.string()
        .uri()                            // Must be a valid URL
        .allow('')                        // Allow empty string (to remove avatar)
        .optional()
        .messages({
            'string.uri': 'Avatar must be a valid URL',
        }),
}).min(1).messages({                       // At least one field must be provided
    'object.min': 'At least one field must be provided',
});

// ---------------------------------------------------------
// CHANGE PASSWORD SCHEMA
// ---------------------------------------------------------
// Validates data when a user changes their password
export const changePasswordSchema = Joi.object({
    // Current password: must be provided to verify identity
    currentPassword: Joi.string()
        .required()
        .messages({
            'any.required': 'Current password is required',
            'string.empty': 'Current password cannot be empty',
        }),

    // New password: 6-128 characters
    newPassword: Joi.string()
        .min(6)
        .max(128)
        .required()
        .messages({
            'string.min': 'New password must be at least 6 characters',
            'string.max': 'New password must not exceed 128 characters',
            'any.required': 'New password is required',
        }),

    // Confirm password: must match the new password exactly
    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))    // Must match newPassword field
        .required()
        .messages({
            'any.only': 'Passwords do not match',
            'any.required': 'Please confirm your new password',
        }),
});
