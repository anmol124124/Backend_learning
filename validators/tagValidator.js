import Joi from 'joi';

// ---------------------------------------------------------
// VALIDATE FUNCTION (reusable)
// ---------------------------------------------------------
export const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
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

        req.body = value;
        next();
    };
};

// ---------------------------------------------------------
// TAG ARRAY VALIDATION
// ---------------------------------------------------------
// Validates an array of tag names when creating/updating posts
export const tagArraySchema = Joi.array()
    .items(
        Joi.string()
            .trim()
            .min(1)
            .max(50)
            .pattern(/^[a-zA-Z0-9\s-]+$/) // Letters, numbers, spaces, hyphens
            .messages({
                'string.empty': 'Tag name cannot be empty',
                'string.max': 'Tag name must not exceed 50 characters',
                'string.pattern.base': 'Tag can only contain letters, numbers, spaces, and hyphens',
            })
    )
    .max(10) // Maximum 10 tags per post
    .unique()
    .optional()
    .messages({
        'array.max': 'Cannot add more than 10 tags',
        'array.unique': 'Tags must be unique',
    });
