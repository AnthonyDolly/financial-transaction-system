import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: config.SWAGGER_TITLE,
    version: config.SWAGGER_VERSION,
    description: config.SWAGGER_DESCRIPTION,
    contact: {
      name: config.SWAGGER_CONTACT_NAME,
      email: config.SWAGGER_CONTACT_EMAIL,
    },
  },
  servers: config.NODE_ENV === 'production' 
    ? [
        { url: config.AZURE_APP_NAME, description: 'Production' },
      ]
    : [
        { url: 'http://localhost:3000', description: 'Local Development' },
        { url: config.AZURE_APP_NAME, description: 'Production' },
      ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Authentication', description: 'Authentication & JWT' },
    { name: 'Users', description: 'User management' },
    { name: 'Accounts', description: 'Account operations' },
    { name: 'Transactions', description: 'Transaction operations' },
    { name: 'Notifications', description: 'Notification system' },
    { name: 'Dashboards', description: 'Analytics & KPIs' },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/docs/*.yaml', './src/docs/*.yml', './src/docs/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  // Debug endpoint to check swagger spec
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: config.NODE_ENV === 'production' 
        ? '.swagger-ui .topbar { display: none } .swagger-ui .servers { display: none !important; } .swagger-ui .servers-title { display: none !important; }'
        : '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Financial Transaction System API',
      swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        showCommonExtensions: true,
        // Hide server selector in production
        ...(config.NODE_ENV === 'production' && { 
          defaultModelsExpandDepth: -1,
          defaultModelExpandDepth: 1,
        }),
      },
    })
  );
}
