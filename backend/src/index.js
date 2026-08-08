const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

if (process.env.JWT_SECRET_FILE) {
  process.env.JWT_SECRET = fs
    .readFileSync(process.env.JWT_SECRET_FILE, "utf8")
    .trim();
}

if (process.env.DB_PASSWORD_FILE) {
  const dbPassword = fs.readFileSync(process.env.DB_PASSWORD_FILE, "utf8").trim();
  process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${dbPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}

const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { PrismaClient, Role, AdoptionRequestStatus } = require("@prisma/client");
const { register, metricsMiddleware } = require("./metrics");
const { authenticate, authorize } = require("./auth");
const {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} = require("./errors");

const prisma = new PrismaClient();
const app = express();
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `${crypto.randomBytes(16).toString("hex")}${extension}`);
  },
});
const upload = multer({ storage: uploadStorage });
const isProduction = process.env.NODE_ENV === "production";
const accessTokenExpiry = "15m";
const refreshTokenLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const refreshCookieName = "refreshToken";

function parseAllowedOrigins(value) {
  if (!value) {
    return [
      "http://localhost:3000",
    ];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function sendJsonError(res, error) {
  const statusCode = error.statusCode || 500;
  const payload = {
    error:
      statusCode >= 500 && isProduction
        ? "Internal server error"
        : error.message || "Internal server error",
  };

  if (!isProduction && error.details) {
    payload.details = error.details;
  }

  res.status(statusCode).json(payload);
}

function requireString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return value.trim();
}

function requireEmail(value) {
  const email = requireString(value, "Email");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new ValidationError("Email is invalid");
  }

  return email.toLowerCase();
}

function requirePassword(value) {
  const password = requireString(value, "Password");

  if (password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters long");
  }

  return password;
}

function requireInteger(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }

  return parsedValue;
}

function requirePhoneNumber(value) {
  const phoneNumber = requireString(value, "Phone number");
  const phonePattern = /^[0-9+()\-\s]{7,20}$/;

  if (!phonePattern.test(phoneNumber)) {
    throw new ValidationError("Phone number is invalid");
  }

  return phoneNumber;
}

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    deletedAt: user.deletedAt,
  };
}

function accessTokenForUser(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: accessTokenExpiry }
  );
}

function refreshTokenForUser() {
  return crypto.randomBytes(48).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: refreshTokenLifetimeMs,
  };
}

function setRefreshTokenCookie(res, token) {
  res.cookie(refreshCookieName, token, refreshCookieOptions());
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(refreshCookieName, { ...refreshCookieOptions(), maxAge: undefined });
}

async function logAudit({ userId, action, entity, entityId, metadata }) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId: String(entityId),
      metadata: metadata ?? undefined,
    },
  });
}

async function getActiveUserOrThrow(userId) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
  });

  if (!user) {
    throw new AuthenticationError("User not found");
  }

  return user;
}

async function getActivePetOrThrow(petId) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      deletedAt: null,
    },
  });

  if (!pet) {
    throw new NotFoundError("Pet not found");
  }

  return pet;
}

async function revokeRefreshTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

async function createRefreshTokenRecord(userId) {
  const refreshToken = refreshTokenForUser();
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + refreshTokenLifetimeMs),
    },
  });

  return refreshToken;
}

async function issueTokenPair(user, res) {
  const accessToken = accessTokenForUser(user);
  const refreshToken = await createRefreshTokenRecord(user.id);
  setRefreshTokenCookie(res, refreshToken);

  return { accessToken };
}

function validatePetPayload(body) {
  return {
    name: requireString(body.name, "Name"),
    species: requireString(body.species, "Species"),
    age: requireInteger(body.age, "Age"),
    description: requireString(body.description, "Description"),
    city: requireString(body.city, "City"),
  };
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked"));
    },
    credentials: true,
  })
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (req, res) => res.json({ status: "UP" }));
app.use(metricsMiddleware);

app.post(
  ["/api/auth/register", "/api/register"],
  registerLimiter,
  asyncHandler(async (req, res) => {
    const email = requireEmail(req.body.email);
    const password = requirePassword(req.body.password);
    const firstName = requireString(req.body.firstName, "First name");
    const lastName = requireString(req.body.lastName, "Last name");

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ValidationError("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: Role.USER,
      },
    });

    await logAudit({
      userId: user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    res.status(201).json({
      message: "User created",
      user: safeUser(user),
    });
  })
);

app.post(
  ["/api/auth/login", "/api/login"],
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = requireEmail(req.body.email);
    const password = requirePassword(req.body.password);
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      throw new AuthenticationError("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new AuthenticationError("Invalid credentials");
    }

    const { accessToken } = await issueTokenPair(user, res);

    await logAudit({
      userId: user.id,
      action: "USER_LOGIN",
      entity: "User",
      entityId: user.id,
      metadata: { email: user.email },
    });

    res.json({
      accessToken,
      user: safeUser(user),
    });
  })
);

app.post(
  "/api/auth/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies[refreshCookieName];
    if (!refreshToken) {
      throw new AuthenticationError("Refresh token missing");
    }

    const tokenHash = hashToken(refreshToken);
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!tokenRecord) {
      throw new AuthenticationError("Invalid refresh token");
    }

    const user = await getActiveUserOrThrow(tokenRecord.userId);
    const nextRefreshToken = refreshTokenForUser();

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(nextRefreshToken),
          expiresAt: new Date(Date.now() + refreshTokenLifetimeMs),
        },
      }),
    ]);

    setRefreshTokenCookie(res, nextRefreshToken);

    res.json({
      accessToken: accessTokenForUser(user),
      user: safeUser(user),
    });
  })
);

app.post(
  "/api/auth/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies[refreshCookieName];

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    clearRefreshTokenCookie(res);
    res.status(204).end();
  })
);

app.get(
  "/api/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;
    res.json({ user: safeUser(user) });
  })
);

app.patch(
  "/api/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;

    const updates = {};

    if (req.body.email !== undefined) {
      updates.email = requireEmail(req.body.email);
    }

    if (req.body.password !== undefined) {
      updates.password = await bcrypt.hash(requirePassword(req.body.password), 12);
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError("No changes submitted");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updates,
    });

    res.json({ user: safeUser(updatedUser) });
  })
);

app.get(
  ["/api/pets", "/api/animals"],
  asyncHandler(async (req, res) => {
    const pets = await prisma.pet.findMany({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.json(pets);
  })
);

app.get(
  "/api/pets/mine",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;

    const pets = await prisma.pet.findMany({
      where: {
        deletedAt: null,
        userId: user.id,
      },
      orderBy: { id: "desc" },
    });

    res.json(pets);
  })
);

app.get(
  ["/api/pets/:id", "/api/animals/:id"],
  asyncHandler(async (req, res) => {
    const petId = requireInteger(req.params.id, "Pet id");
    const pet = await prisma.pet.findFirst({
      where: {
        id: petId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!pet) {
      throw new NotFoundError("Pet not found");
    }

    res.json(pet);
  })
);

app.post(
  ["/api/pets", "/api/animals"],
  authenticate,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;
    const petData = validatePetPayload(req.body);

    const pet = await prisma.pet.create({
      data: {
        ...petData,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        userId: user.id,
      },
    });

    await logAudit({
      userId: user.id,
      action: "PET_CREATED",
      entity: "Pet",
      entityId: pet.id,
      metadata: petData,
    });

    res.status(201).json(pet);
  })
);

app.patch(
  ["/api/pets/:id", "/api/animals/:id"],
  authenticate,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;
    const petId = requireInteger(req.params.id, "Pet id");
    const pet = await getActivePetOrThrow(petId);

    if (pet.userId !== user.id && user.role !== Role.ADMIN) {
      throw new AuthorizationError("You cannot edit this pet");
    }

    const petData = validatePetPayload(req.body);
    const updatedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        ...petData,
        ...(req.file ? { imageUrl: `/uploads/${req.file.filename}` } : {}),
      },
    });

    await logAudit({
      userId: user.id,
      action: "PET_UPDATED",
      entity: "Pet",
      entityId: updatedPet.id,
      metadata: petData,
    });

    res.json(updatedPet);
  })
);

app.delete(
  ["/api/pets/:id", "/api/animals/:id"],
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;
    const petId = requireInteger(req.params.id, "Pet id");
    const pet = await getActivePetOrThrow(petId);

    if (pet.userId !== user.id && user.role !== Role.ADMIN) {
      throw new AuthorizationError("You cannot delete this pet");
    }

    const deletedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      userId: user.id,
      action: "PET_DELETED",
      entity: "Pet",
      entityId: deletedPet.id,
      metadata: { softDelete: true },
    });

    res.json({ message: "Pet removed" });
  })
);

app.get(
  "/api/admin/users",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        deletedAt: true,
      },
    });

    res.json(users);
  })
);

app.get(
  "/api/admin/pets",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const pets = await prisma.pet.findMany({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.json(pets);
  })
);

app.patch(
  "/api/admin/users/:id/deactivate",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const targetUserId = requireInteger(req.params.id, "User id");
    const targetUser = await getActiveUserOrThrow(targetUserId);

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: { deletedAt: new Date() },
    });

    await revokeRefreshTokens(updatedUser.id);

    await logAudit({
      userId: req.user.id,
      action: "USER_DEACTIVATED",
      entity: "User",
      entityId: updatedUser.id,
      metadata: { deactivatedBy: req.user.id },
    });

    res.json({ message: "User deactivated" });
  })
);

app.post(
  "/api/adoption-requests",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;
    const petId = requireInteger(req.body.petId, "Pet id");
    const phoneNumber = requirePhoneNumber(req.body.phoneNumber);
    const message = typeof req.body.message === "string" && req.body.message.trim() ? req.body.message.trim() : null;
    const pet = await getActivePetOrThrow(petId);

    if (pet.userId === user.id) {
      throw new ValidationError("You cannot request your own pet");
    }

    const existingRequest = await prisma.adoptionRequest.findFirst({
      where: {
        petId,
        requesterId: user.id,
        status: AdoptionRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new ValidationError("You already have a pending request for this pet");
    }

    const adoptionRequest = await prisma.adoptionRequest.create({
      data: {
        petId,
        requesterId: user.id,
        phoneNumber,
        message,
      },
    });

    await logAudit({
      userId: user.id,
      action: "ADOPTION_REQUEST_CREATED",
      entity: "AdoptionRequest",
      entityId: adoptionRequest.id,
      metadata: { petId, phoneNumber, message },
    });

    res.status(201).json(adoptionRequest);
  })
);

app.get(
  "/api/adoption-requests",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;

    const requests = await prisma.adoptionRequest.findMany({
      where: user.role === Role.ADMIN
        ? {}
        : {
            OR: [
              { requesterId: user.id },
              {
                pet: {
                  userId: user.id,
                },
              },
            ],
          },
      orderBy: { id: "desc" },
      include: {
        pet: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.json(requests);
  })
);

app.patch(
  "/api/adoption-requests/:id/approve",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;
    const requestId = requireInteger(req.params.id, "Request id");
    const request = await prisma.adoptionRequest.findFirst({
      where: { id: requestId },
      include: { pet: true },
    });

    if (!request) {
      throw new NotFoundError("Adoption request not found");
    }

    if (request.pet.userId !== user.id && user.role !== Role.ADMIN) {
      throw new AuthorizationError("You cannot review this request");
    }

    if (request.status !== AdoptionRequestStatus.PENDING) {
      throw new ValidationError("Request has already been processed");
    }

    const updatedRequest = await prisma.adoptionRequest.update({
      where: { id: request.id },
      data: {
        status: AdoptionRequestStatus.APPROVED,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    await logAudit({
      userId: user.id,
      action: "ADOPTION_REQUEST_APPROVED",
      entity: "AdoptionRequest",
      entityId: updatedRequest.id,
      metadata: { requesterId: request.requesterId, petId: request.petId },
    });

    res.json(updatedRequest);
  })
);

app.patch(
  "/api/adoption-requests/:id/reject",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.auth.sub ? Number(req.auth.sub) : req.auth.userId;
    const user = await getActiveUserOrThrow(userId);
    req.user = user;
    const requestId = requireInteger(req.params.id, "Request id");
    const request = await prisma.adoptionRequest.findFirst({
      where: { id: requestId },
      include: { pet: true },
    });

    if (!request) {
      throw new NotFoundError("Adoption request not found");
    }

    if (request.pet.userId !== user.id && user.role !== Role.ADMIN) {
      throw new AuthorizationError("You cannot review this request");
    }

    if (request.status !== AdoptionRequestStatus.PENDING) {
      throw new ValidationError("Request has already been processed");
    }

    const updatedRequest = await prisma.adoptionRequest.update({
      where: { id: request.id },
      data: {
        status: AdoptionRequestStatus.REJECTED,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    await logAudit({
      userId: user.id,
      action: "ADOPTION_REQUEST_REJECTED",
      entity: "AdoptionRequest",
      entityId: updatedRequest.id,
      metadata: { requesterId: request.requesterId, petId: request.petId },
    });

    res.json(updatedRequest);
  })
);

    app.get("/metrics", async (req, res) => {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    });

app.use((req, res, next) => next(new NotFoundError("Route not found")));

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === "P2002") {
    return sendJsonError(res, new ValidationError("Duplicate value detected"));
  }

  if (error.code === "P2025") {
    return sendJsonError(res, new NotFoundError("Resource not found"));
  }

  sendJsonError(res, error);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
