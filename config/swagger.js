// ---------------------------------------------------------
// SWAGGER CONFIGURATION (API Documentation)
// ---------------------------------------------------------
// Swagger generates interactive API documentation automatically
// Visit /api-docs to see and test all your API endpoints

// Import the swagger-jsdoc library (reads JSDoc comments from code)
import swaggerJSDoc from "swagger-jsdoc";

// Configure Swagger settings
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",                          // OpenAPI specification version

    // API information displayed at the top of the docs page
    info: {
      title: "Backend Learning API",            // Name of the API
      version: "1.0.0",                         // API version
      description: "Swagger documentation for Backend Learning project",  // Description
    },

    // List of servers where the API is available
    servers: [
      {
        url: "http://localhost:3000",            // Development server URL
        description: "Production - Level - Development - Server",
      },
      // Uncomment when deploying to production:
      // {
      //   url: "https://api.yourdomain.com",
      //   description: "Production Server",
      // },
    ],

    // Define authentication methods available in the API
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",                          // HTTP authentication
          scheme: "bearer",                      // Bearer token scheme
          bearerFormat: "JWT",                   // Tokens are JWTs
        },
      },
    },

    // Apply bearer auth globally to all endpoints by default
    security: [
      {
        bearerAuth: [],                          // All routes need JWT by default
      },
    ],
  },

  // Tell Swagger where to find the route files with JSDoc comments
  // It scans these files for @swagger annotations
  apis: ["./routes/*.js"],
};

// Generate the Swagger specification from the options
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Export the specification for use in app.js
export default swaggerSpec;
