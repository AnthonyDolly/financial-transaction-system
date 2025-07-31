import { ApolloServer } from '@apollo/server';
import { buildSchema } from 'type-graphql';
import { AuthResolver } from './resolvers/authResolver';
import { AuditResolver } from './resolvers/auditResolver';
import { DashboardResolver } from './resolvers/dashboardResolver';
import { GraphQLContext } from './context';
import { logger } from '../utils/logger';
import http from 'http';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { config } from '../config/env';
import { JwtUtil } from '../utils/jwt';

export async function createApolloServer(httpServer: http.Server): Promise<ApolloServer> {
  const schema = await buildSchema({
    resolvers: [AuthResolver, AuditResolver, DashboardResolver],
    authChecker: ({ context }, roles: string[]) => {
      const { user } = context as GraphQLContext;

      if (!user) {
        return false;
      }

      if (roles.length === 0) {
        return true;
      }

      return roles.includes(user.role);
    },
    validate: false,
  });

  const server = new ApolloServer({
    schema,
    introspection: config.NODE_ENV !== 'production',
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      config.NODE_ENV !== 'production'
        ? ApolloServerPluginLandingPageLocalDefault({ embed: true })
        : ApolloServerPluginLandingPageLocalDefault({ embed: false }),
    ],
  });

  return server;
}

export async function createGraphQLContext({
  req,
  res,
}: {
  req: any;
  res: any;
}): Promise<GraphQLContext> {
  let user = null;

  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await JwtUtil.verifyAccessToken(token);
      if (payload && payload.sub && payload.email && payload.role) {
        user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          // Optionally add: firstName, lastName, isActive if available in payload
          isActive: true, // default or extract from payload if present
        };
      }
    }
  } catch (error) {
    logger.debug('Token verification failed:', error);
  }

  return {
    req,
    res,
    user,
  };
}
