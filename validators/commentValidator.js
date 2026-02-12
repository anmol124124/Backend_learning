// ---------------------------------------------------------
// COMMENT VALIDATORS
// ---------------------------------------------------------
// These validation schemas check if comment data is valid
// before it's saved to the database

// Import Joi validation library
import Joi from 'joi';

// ---------------------------------------------------------
// VALIDATE FUNCTION (Reusable Middleware)
// ---------------------------------------------------------
export const validate = (schema) => {
    return (req, res, next) => {
        // Validate request body against the schema
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,           // Show all errors at once
            stripUnknown: true,          // Remove unknown fields
        });

        // If validation fails, return errors
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
// CREATE COMMENT SCHEMA
// ---------------------------------------------------------
// Validates data when creating a new comment
export const createCommentSchema = Joi.object({
    // Post ID: which post this comment is for
    postId: Joi.number()
        .integer()                       // Must be a whole number
        .positive()                      // Must be greater than 0
        .required()                      // This field is mandatory
        .messages({
            'number.base': 'Post ID must be a number',
            'number.positive': 'Post ID must be positive',
            'any.required': 'Post ID is required',
        }),

    // Content: the actual comment text
    content: Joi.string()
        .min(1)                          // Can't be empty
        .max(1000)                       // Maximum 1000 characters
        .required()
        .messages({
            'string.min': 'Comment cannot be empty',
            'string.max': 'Comment must not exceed 1000 characters',
            'any.required': 'Comment content is required',
        }),

    // Parent Comment ID: for replies to other comments (nested comments)
    parentCommentId: Joi.number()
        .integer()
        .positive()
        .optional()                      // This is optional (only for replies)
        .allow(null)                     // Can be null (top-level comments)
        .messages({
            'number.base': 'Parent comment ID must be a number',
            'number.positive': 'Parent comment ID must be positive',
        }),
});