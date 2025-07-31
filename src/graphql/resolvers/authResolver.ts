import { Resolver, Query, Ctx } from 'type-graphql';
import { GraphQLContext } from '../../graphql/context';

@Resolver()
export class AuthResolver {
  @Query(() => String)
  async hello(): Promise<string> {
    return 'Hello from GraphQL!';
  }

  @Query(() => String)
  async me(@Ctx() context: GraphQLContext): Promise<string> {
    if (!context.user) {
      throw new Error('Not authenticated');
    }
    return `Hello ${context.user.email}!`;
  }
} 