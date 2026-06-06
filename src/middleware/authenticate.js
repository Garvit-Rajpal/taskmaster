'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { UnauthenticatedError } = require('../errors/AppError');
const prisma = require('../lib/prisma');

/** Verify the Bearer access token and attach req.user (without password). */
async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthenticatedError('Missing or malformed Authorization header');
    }
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (e) {
      const expired = e && e.name === 'TokenExpiredError';
      throw new UnauthenticatedError(
        expired ? 'Access token expired' : 'Invalid access token',
        expired ? 'TOKEN_EXPIRED' : 'UNAUTHENTICATED'
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });
    if (!user) throw new UnauthenticatedError('User no longer exists');
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = authenticate;
