import Joi from 'joi';

// Reusable validate function for body
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

// Validate query parameters (for pagination)
export const validateQuery = (schema) => {
    return (req, res, next) => {
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

        // Store validated query params in a new property instead of replacing req.query
        req.validatedQuery = value;
        next();
    };
};

// Schema for creating a post
export const createPostSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.min': 'Title must be at least 3 characters long',
            'string.max': 'Title must not exceed 200 characters',
            'any.required': 'Title is required',
        }),

    content: Joi.string()
        .min(10)
        .max(10000)
        .required()
        .messages({
            'string.min': 'Content must be at least 10 characters long',
            'string.max': 'Content must not exceed 10000 characters',
            'any.required': 'Content is required',
        }),

    image: Joi.string()
        .uri()
        .allow(null, '')
        .optional()
        .messages({
            'string.uri': 'Image must be a valid URL',
        }),
});

// Schema for updating a post
export const updatePostSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(200)
        .optional(),

    content: Joi.string()
        .min(10)
        .max(10000)
        .optional(),

    image: Joi.string()
        .uri()
        .allow(null, '')
        .optional()
        .messages({
            'string.uri': 'Image must be a valid URL',
        }),
}).min(1).messages({
    'object.min': 'At least one field (title, content, or image) must be provided',
});

// Schema for pagination
export const paginationSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10),

    search: Joi.string()
        .allow('')
        .optional()
        .default(''),
});