import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JwtPayload, UserPayload } from '../types/auth';
import { logger } from '../utils/logger';

export class JwtUtil {
  /**
   * Generate access token
   */
  static generateAccessToken(user: UserPayload): string {
    if (!config.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRE_IN,
      issuer: 'financial-transaction-system',
      audience: 'financial-api',
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(user: UserPayload): string {
    if (!config.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };

    return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRE_IN,
      issuer: 'financial-transaction-system',
      audience: 'financial-api',
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokens(user: UserPayload): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtPayload | null {
    if (!config.JWT_SECRET) {
      logger.error('JWT_SECRET is not configured');
      return null;
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'financial-transaction-system',
        audience: 'financial-api',
      }) as JwtPayload;

      if (decoded.type !== 'access') {
        logger.warn(`Invalid token type: ${decoded.type}`);
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn(`JWT verification failed: ${error.message}`);
      } else {
        logger.error('JWT verification error:', error);
      }
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JwtPayload | null {
    if (!config.JWT_REFRESH_SECRET) {
      logger.error('JWT_REFRESH_SECRET is not configured');
      return null;
    }

    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, {
        issuer: 'financial-transaction-system',
        audience: 'financial-api',
      }) as JwtPayload;

      if (decoded.type !== 'refresh') {
        logger.warn(`Invalid token type: ${decoded.type}`);
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn(`JWT refresh verification failed: ${error.message}`);
      } else {
        logger.error('JWT refresh verification error:', error);
      }
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authorization: string | undefined): string | null {
    if (!authorization) {
      return null;
    }

    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] ?? null;
  }

  /**
   * Get token expiration date
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload | null;
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }
    return expiration.getTime() < Date.now();
  }
}