import Joi from 'joi';

// Validation middleware wrapper
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

// Schema for creating a comment
export const createCommentSchema = Joi.object({
    postId: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Post ID must be a number',
            'number.positive': 'Post ID must be positive',
            'any.required': 'Post ID is required',
        }),
    content: Joi.string()
        .min(1)
        .max(1000)
        .required()
        .messages({
            'string.min': 'Comment cannot be empty',
            'string.max': 'Comment must not exceed 1000 characters',
            'any.required': 'Comment content is required',
        }),
    parentCommentId: Joi.number()
        .integer()
        .positive()
        .optional()
        .allow(null)
        .messages({
            'number.base': 'Parent comment ID must be a number',
            'number.positive': 'Parent comment ID must be positive',
        }),
});