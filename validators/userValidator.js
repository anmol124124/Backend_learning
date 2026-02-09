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
// UPDATE PROFILE SCHEMA
// ---------------------------------------------------------
export const updateProfileSchema = Joi.object({
    username: Joi.string()
        .min(3)
        .max(50)
        .optional()
        .messages({
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username must not exceed 50 characters',
        }),

    bio: Joi.string()
        .max(500)
        .allow('')
        .optional()
        .messages({
            'string.max': 'Bio must not exceed 500 characters',
        }),

    avatar: Joi.string()
        .uri()
        .allow('')
        .optional()
        .messages({
            'string.uri': 'Avatar must be a valid URL',
        }),
}).min(1).messages({
    'object.min': 'At least one field must be provided',
});

// ---------------------------------------------------------
// CHANGE PASSWORD SCHEMA
// ---------------------------------------------------------
export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            'any.required': 'Current password is required',
            'string.empty': 'Current password cannot be empty',
        }),

    newPassword: Joi.string()
        .min(6)
        .max(128)
        .required()
        .messages({
            'string.min': 'New password must be at least 6 characters',
            'string.max': 'New password must not exceed 128 characters',
            'any.required': 'New password is required',
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'Passwords do not match',
            'any.required': 'Please confirm your new password',
        }),
});
