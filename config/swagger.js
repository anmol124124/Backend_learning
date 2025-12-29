import swaggerJSDoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Backend Learning API",
      version: "1.0.0",
      description: "Swagger documentation for Backend Learning project",
    },

    servers: [
      {
        url: "http://localhost:3000",
        description: "Local Development Server",
      },
      // 👇 uncomment when deployed
      // {
      //   url: "https://api.yourdomain.com",
      //   description: "Production Server",
      // },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // 👇 yaha par tumhare route files ka path aayega
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;
