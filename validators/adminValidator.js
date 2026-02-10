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
// UPDATE USER ROLE SCHEMA
// ---------------------------------------------------------
export const updateRoleSchema = Joi.object({
    role: Joi.string()
        .valid('user', 'admin')
        .required()
        .messages({
            'any.only': 'Role must be either "user" or "admin"',
            'any.required': 'Role is required',
        }),
});

// ---------------------------------------------------------
// BAN REASON SCHEMA (optional)
// ---------------------------------------------------------
export const banSchema = Joi.object({
    reason: Joi.string()
        .max(500)
        .optional()
        .messages({
            'string.max': 'Ban reason must not exceed 500 characters',
        }),
});
