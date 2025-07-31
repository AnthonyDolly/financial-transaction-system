import 'reflect-metadata'; // Required for TypeGraphQL
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { expressMiddleware } from '@apollo/server/express4';
import { config } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './config/swagger';
import DatabaseConnection from './config/database';
import { connectRedis, disconnectRedis } from './utils/redisClient';
import { createApolloServer, createGraphQLContext } from './graphql/server';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import accountRoutes from './routes/accountRoutes';
import transactionRoutes from './routes/transactionRoutes';
import notificationRoutes from './routes/notificationRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

const app = express();

const httpServer = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.NODE_ENV === 'production' ? config.ALLOWED_ORIGINS : true,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for IP:', req.ip);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
    });
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Setup Swagger documentation
setupSwagger(app);

// API Routes
app.use(`${config.API_PREFIX}/auth`, authRoutes);
app.use(`${config.API_PREFIX}/users`, userRoutes);
app.use(`${config.API_PREFIX}/accounts`, accountRoutes);
app.use(`${config.API_PREFIX}/transactions`, transactionRoutes);
app.use(`${config.API_PREFIX}/notifications`, notificationRoutes);
app.use(`${config.API_PREFIX}/dashboards`, dashboardRoutes);

// Root API endpoint
app.get(config.API_PREFIX, (req, res) => {
  res.status(200).json({
    message: 'Financial Transaction System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      docs: '/docs',
      graphql: '/graphql',
      auth: `${config.API_PREFIX}/auth`,
      users: `${config.API_PREFIX}/users`,
      accounts: `${config.API_PREFIX}/accounts`,
      transactions: `${config.API_PREFIX}/transactions`,
      notifications: `${config.API_PREFIX}/notifications`,
    },
  });
});

// Error handling middleware (debe ir al final de las rutas REST)
app.use(errorHandler);

// Initialize database connection and start server
let server: http.Server;

async function initializeApp() {
  try {
    // Connect to database
    await DatabaseConnection.connect();

    // Connect to Redis
    try {
      await connectRedis();
      if (config.NODE_ENV === 'development') {
        logger.info('🔗 Redis connected successfully');
      }
    } catch (redisError) {
      logger.warn('⚠️ Redis connection failed - continuing without Redis', redisError);
      // Continue without Redis if it fails - this allows the app to run even if Redis is down
    }

    // Initialize GraphQL server
    const apolloServer = await createApolloServer(httpServer);
    await apolloServer.start();

    // Relax CSP for /graphql Playground/Sandbox
    app.use(
      '/graphql',
      helmet({
        contentSecurityPolicy: {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'script-src': [
              "'self'",
              "'unsafe-inline'",
              'https:',
              'cdn.jsdelivr.net',
              'https://studio.apollographql.com',
              'https://apollo-server-landing-page.cdn.apollographql.com',
              'https://embeddable-sandbox.cdn.apollographql.com',
            ],
            'img-src': [
              "'self'",
              'data:',
              'https:',
              'cdn.jsdelivr.net',
              'https://studio.apollographql.com',
              'https://apollo-server-landing-page.cdn.apollographql.com',
            ],
            'connect-src': [
              "'self'",
              'https://studio.apollographql.com',
              'https://apollo-server-landing-page.cdn.apollographql.com',
              'https://embeddable-sandbox.cdn.apollographql.com',
              'https:',
            ],
            'frame-src': [
              "'self'",
              'https://sandbox.embed.apollographql.com',
              'https://studio.apollographql.com',
            ],
            'manifest-src': ["'self'", 'https://apollo-server-landing-page.cdn.apollographql.com'],
            // Optionally, for any other issues:
            // "default-src": ["'self'", "https:", "data:"],
          },
        },
      })
    );

    // Apply GraphQL middleware
    app.use(
      '/graphql',
      cors<cors.CorsRequest>({
        origin: config.NODE_ENV === 'production' ? config.ALLOWED_ORIGINS : true,
        credentials: true,
      }),
      express.json(),
      expressMiddleware(apolloServer, {
        context: createGraphQLContext,
      })
    );

    if (config.NODE_ENV === 'development') {
      logger.info('🎯 GraphQL server initialized');
    }

    // Start server
    server = httpServer.listen(config.PORT, () => {
      // Solo mostrar logs detallados en desarrollo
      if (config.NODE_ENV === 'development') {
        logger.info(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
        logger.info(`📚 API Documentation available at http://localhost:${config.PORT}/docs`);
        logger.info(`🏥 Health check available at http://localhost:${config.PORT}/health`);
        logger.info(
          `🔐 Auth endpoints available at http://localhost:${config.PORT}${config.API_PREFIX}/auth`
        );
        logger.info(
          `👥 User endpoints available at http://localhost:${config.PORT}${config.API_PREFIX}/users`
        );
        logger.info(
          `🏦 Account endpoints available at http://localhost:${config.PORT}${config.API_PREFIX}/accounts`
        );
        logger.info(
          `💸 Transaction endpoints available at http://localhost:${config.PORT}${config.API_PREFIX}/transactions`
        );
        logger.info(
          `🔔 Notification endpoints available at http://localhost:${config.PORT}${config.API_PREFIX}/notifications`
        );
      } else {
        // En producción, solo mostrar información esencial
        logger.info(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
      }
      if (config.NODE_ENV === 'development') {
        logger.info(`🎯 GraphQL playground available at http://localhost:${config.PORT}/graphql`);
      }
    });
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, shutting down gracefully`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    // Disconnect Redis
    try {
      await disconnectRedis();
      logger.info('Redis connection closed');
    } catch (redisError) {
      logger.warn('Failed to disconnect Redis:', redisError);
    }

    // Then disconnect database
    await DatabaseConnection.disconnect();
    logger.info('Database connection closed');

    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Initialize app
initializeApp();

// Setup process handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
