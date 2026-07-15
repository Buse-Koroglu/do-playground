const fs = require("fs");

if (process.env.JWT_SECRET_FILE) {
  process.env.JWT_SECRET = fs
    .readFileSync(process.env.JWT_SECRET_FILE, "utf8")
    .trim();
}
if (process.env.DB_PASSWORD_FILE) {
  const dbPassword = fs
    .readFileSync(process.env.DB_PASSWORD_FILE, "utf8")
    .trim();
  process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${dbPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const auth = require("./auth");

const prisma = new PrismaClient();
const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/health", (req, res) => res.json({ status: "UP" }));

app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await prisma.user.create({ data: { email, password: hashedPassword } });
    res.status(201).json({ message: "User created" });
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    return res.json({ token });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

app.get("/api/animals", async (req, res) => {
  const animals = await prisma.animal.findMany();
  res.json(animals);
});

app.post("/api/animals", auth, upload.single("image"), async (req, res) => {
  const { name, species, age, description, city } = req.body;
  const animal = await prisma.animal.create({
    data: {
      name,
      species,
      age: parseInt(age),
      description,
      city,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      userId: req.userId,
    },
  });
  res.status(201).json(animal);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
