// ---------------------------------------------------------
// POST VALIDATORS
// ---------------------------------------------------------
// These validation schemas check if post data is valid
// Includes schemas for creating, updating, and paginating posts

// Import Joi validation library
import Joi from 'joi';

// ---------------------------------------------------------
// VALIDATE BODY (Reusable Middleware)
// ---------------------------------------------------------
// Validates request body data
export const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,           // Show all errors at once
            stripUnknown: true,          // Remove fields not in schema
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
        next();
    };
};

// ---------------------------------------------------------
// VALIDATE QUERY PARAMS (Reusable Middleware)
// ---------------------------------------------------------
// Validates URL query parameters (e.g., ?page=1&limit=10)
export const validateQuery = (schema) => {
    return (req, res, next) => {
        // Validate req.query instead of req.body
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
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

        // Store validated query in a separate property (don't overwrite req.query)
        req.validatedQuery = value;
        next();
    };
};

// ---------------------------------------------------------
// CREATE POST SCHEMA
// ---------------------------------------------------------
// Validates data when creating a new post
export const createPostSchema = Joi.object({
    // Title: 3-200 characters, required
    title: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.min': 'Title must be at least 3 characters long',
            'string.max': 'Title must not exceed 200 characters',
            'any.required': 'Title is required',
        }),

    // Content: 10-10000 characters, required
    content: Joi.string()
        .min(10)
        .max(10000)
        .required()
        .messages({
            'string.min': 'Content must be at least 10 characters long',
            'string.max': 'Content must not exceed 10000 characters',
            'any.required': 'Content is required',
        }),

    // Image URL: optional, must be a valid URL if provided
    image: Joi.string()
        .uri()                            // Must be a valid URL
        .allow(null, '')                  // Can be null or empty string
        .optional()
        .messages({
            'string.uri': 'Image must be a valid URL',
        }),

    // Tags: optional array of tag names
    tags: Joi.array()
        .items(
            Joi.string()
                .trim()                    // Remove whitespace from start/end
                .min(1)                    // Each tag must have at least 1 character
                .max(50)                   // Each tag can be max 50 characters
                .pattern(/^[a-zA-Z0-9\s-]+$/)  // Only letters, numbers, spaces, hyphens
        )
        .max(10)                          // Maximum 10 tags per post
        .unique()                          // No duplicate tags allowed
        .optional(),

    // Category ID: optional, must be a positive integer
    categoryId: Joi.number()
        .integer()
        .positive()
        .optional()
        .allow(null)                      // Can be null (uncategorized)
        .messages({
            'number.base': 'Category ID must be a number',
            'number.integer': 'Category ID must be an integer',
            'number.positive': 'Category ID must be positive',
        }),
});

// ---------------------------------------------------------
// UPDATE POST SCHEMA
// ---------------------------------------------------------
// Validates data when updating an existing post
// At least ONE field must be provided (you can't submit an empty update)
export const updatePostSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(200)
        .optional(),                      // Optional on update

    content: Joi.string()
        .min(10)
        .max(10000)
        .optional(),                      // Optional on update

    image: Joi.string()
        .uri()
        .allow(null, '')
        .optional()
        .messages({
            'string.uri': 'Image must be a valid URL',
        }),
}).min(1).messages({                       // At least one field must be provided
    'object.min': 'At least one field (title, content, or image) must be provided',
});

// ---------------------------------------------------------
// PAGINATION SCHEMA
// ---------------------------------------------------------
// Validates query parameters for paginated list endpoints
export const paginationSchema = Joi.object({
    // Page number: defaults to 1, must be at least 1
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),                      // Default: first page

    // Items per page: defaults to 10, max 100
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10),                     // Default: 10 items per page

    // Search term: optional text to search by
    search: Joi.string()
        .allow('')                        // Allow empty string
        .optional()
        .default(''),                     // Default: no search filter
});