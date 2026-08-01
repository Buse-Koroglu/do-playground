const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { AuthenticationError, AuthorizationError } = require("./errors");

const prisma = new PrismaClient();

async function authenticate(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";
  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : null;

  if (!token) {
    return next(new AuthenticationError("Unauthorized"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = decoded;
    const userId = decoded.sub ? Number(decoded.sub) : decoded.userId;
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      return next(new AuthenticationError("User not found"));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new AuthenticationError("Invalid token"));
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new AuthenticationError("Unauthorized"));
    }

    if (!allowedRoles.includes(req.user?.role || req.auth?.role)) {
      return next(new AuthorizationError("Forbidden"));
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
