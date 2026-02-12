// ---------------------------------------------------------
// TAG VALIDATORS
// ---------------------------------------------------------
// These validation schemas check if tag data is valid

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
// TAG ARRAY VALIDATION SCHEMA
// ---------------------------------------------------------
// Validates an array of tag names (used when adding tags to a post)
export const tagArraySchema = Joi.array()
    .items(
        Joi.string()
            .trim()                       // Remove leading/trailing whitespace
            .min(1)                       // Tag must have at least 1 character
            .max(50)                      // Tag can be max 50 characters
            .pattern(/^[a-zA-Z0-9\s-]+$/) // Only letters, numbers, spaces, and hyphens
            .messages({
                'string.empty': 'Tag name cannot be empty',
                'string.max': 'Tag name must not exceed 50 characters',
                'string.pattern.base': 'Tag can only contain letters, numbers, spaces, and hyphens',
            })
    )
    .max(10)                              // Maximum 10 tags per post
    .unique()                              // No duplicate tag names allowed
    .optional()                            // Tags are optional when creating a post
    .messages({
        'array.max': 'Cannot add more than 10 tags',
        'array.unique': 'Tags must be unique',
    });
