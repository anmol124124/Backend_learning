// ---------------------------------------------------------
// ADMIN VALIDATORS
// ---------------------------------------------------------
// These validation schemas check if admin request data is valid
// before the controller processes it (prevents bad data from reaching the database)

// Import Joi - a powerful data validation library
import Joi from 'joi';

// ---------------------------------------------------------
// VALIDATE FUNCTION (Reusable Middleware)
// ---------------------------------------------------------
// This function takes a Joi schema and returns a middleware
// that validates req.body against that schema
export const validate = (schema) => {
    return (req, res, next) => {
        // Validate the request body against the provided schema
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,           // Show ALL validation errors, not just the first one
            stripUnknown: true,          // Remove any fields not defined in the schema (security!)
        });

        // If validation fails, return the errors to the client
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                // Format each error with the field name and error message
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),       // Which field failed (e.g., "role")
                    message: detail.message,            // What went wrong (e.g., "Role is required")
                })),
            });
        }

        // Replace req.body with the validated/sanitized data
        req.body = value;
        // Validation passed → continue to the next middleware/controller
        next();
    };
};

// ---------------------------------------------------------
// UPDATE USER ROLE SCHEMA
// ---------------------------------------------------------
// Validates data when an admin changes a user's role
export const updateRoleSchema = Joi.object({
    role: Joi.string()
        .valid('user', 'admin')          // Only these two values are allowed
        .required()                       // This field is mandatory
        .messages({
            'any.only': 'Role must be either "user" or "admin"',
            'any.required': 'Role is required',
        }),
});

// ---------------------------------------------------------
// BAN REASON SCHEMA
// ---------------------------------------------------------
// Validates the optional reason when banning a user
export const banSchema = Joi.object({
    reason: Joi.string()
        .max(500)                         // Ban reason can't be longer than 500 characters
        .optional()                       // Reason is optional (admin doesn't have to provide one)
        .messages({
            'string.max': 'Ban reason must not exceed 500 characters',
        }),
});
