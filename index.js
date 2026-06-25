const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const catalogSeed = require("./data/catalogSeed.json");

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const DEMO_ADMIN = {
  id: 1,
  name: "Администратор SweetHand",
  email: "admin@sweethand.local",
  phone: "+7 (999) 000-00-01",
  password: "admin123",
  isAdmin: true,
  date_joined: "2026-06-01T10:00:00.000Z",
  favoriteIds: [],
  orders: [],
};

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

function hashPassword(password) {
  return crypto.createHash("sha256").update(`sweethand:${password}`).digest("hex");
}

function createToken() {
  return `sh_${crypto.randomUUID()}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sendError(res, status, message) {
  res.status(status).json({ detail: message });
}

function ensureDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    return;
  }

  const initialState = {
    categories: clone(catalogSeed.categories),
    products: clone(catalogSeed.products),
    users: [
      {
        id: DEMO_ADMIN.id,
        name: DEMO_ADMIN.name,
        email: DEMO_ADMIN.email,
        phone: DEMO_ADMIN.phone,
        passwordHash: hashPassword(DEMO_ADMIN.password),
        isAdmin: true,
        date_joined: DEMO_ADMIN.date_joined,
        favoriteIds: [],
        orders: [],
      },
    ],
    feedback: [],
    sessions: {},
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(initialState, null, 2));
}

function readDb() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function buildOrderNumber(db) {
  const totalOrders = db.users.reduce((sum, user) => sum + (user.orders || []).length, 0) + 1;
  return `SH-${String(totalOrders).padStart(4, "0")}`;
}

function getCategoryMap(db) {
  return new Map(db.categories.map(category => [category.slug, category]));
}

function getProductMap(db) {
  return new Map(db.products.map(product => [product.id, product]));
}

function badgeLabelFor(product) {
  if (product.badgeLabel) {
    return product.badgeLabel;
  }

  if (product.badge === "hit") {
    return "Хит";
  }

  if (product.badge === "new") {
    return "Новинка";
  }

  return "";
}

function toProductView(db, product) {
  const categoryMap = getCategoryMap(db);
  const category = categoryMap.get(product.categorySlug) || db.categories[0];
  const originalPrice = Number(product.originalPrice) || 0;
  const price = Number(product.price) || 0;
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price,
    originalPrice: originalPrice || null,
    weight: product.weight,
    imageUrl: product.imageUrl,
    badge: product.badge || "",
    badgeLabel: badgeLabelFor(product),
    allergens: product.allergens || "",
    isMonthPick: Boolean(product.isMonthPick),
    discountPercent,
    hasDiscount: discountPercent > 0,
    category,
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    date_joined: user.date_joined,
    isAdmin: Boolean(user.isAdmin),
  };
}

function parseToken(req) {
  const header = req.get("Authorization") || "";

  if (header.startsWith("Token ")) {
    return header.slice(6).trim();
  }

  return "";
}

function getUserByToken(db, token) {
  const userId = db.sessions[token];
  if (!userId) {
    return null;
  }

  return db.users.find(user => user.id === userId) || null;
}

function requireUser(req, res, db) {
  const token = parseToken(req);
  if (!token) {
    sendError(res, 401, "Войдите в аккаунт, чтобы продолжить.");
    return null;
  }

  const user = getUserByToken(db, token);
  if (!user) {
    sendError(res, 401, "Сессия истекла. Войдите снова.");
    return null;
  }

  return { token, user };
}

function requireAdmin(req, res, db) {
  const session = requireUser(req, res, db);
  if (!session) {
    return null;
  }

  if (!session.user.isAdmin) {
    sendError(res, 403, "Доступ только для администратора.");
    return null;
  }

  return session;
}

function buildCategoriesWithCounts(db) {
  const counts = db.products.reduce((acc, product) => {
    acc[product.categorySlug] = (acc[product.categorySlug] || 0) + 1;
    return acc;
  }, {});

  return db.categories.map(category => ({
    ...category,
    product_count: counts[category.slug] || 0,
  }));
}

function sortedOrders(orders) {
  return clone(orders).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/catalog/categories", (_req, res) => {
  const db = readDb();
  res.json(buildCategoriesWithCounts(db));
});

app.get("/api/catalog/products", (req, res) => {
  const db = readDb();
  const category = String(req.query.category || "");

  const products = db.products
    .filter(product => !category || category === "all" || product.categorySlug === category)
    .map(product => toProductView(db, product));

  res.json(products);
});

app.post("/api/auth/register", (req, res) => {
  const db = readDb();
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const phone = String(req.body.phone || "").trim();

  if (!name) {
    return sendError(res, 400, "Укажите имя.");
  }

  if (!email) {
    return sendError(res, 400, "Укажите email.");
  }

  if (password.length < 6) {
    return sendError(res, 400, "Пароль должен содержать минимум 6 символов.");
  }

  if (db.users.some(user => normalizeEmail(user.email) === email)) {
    return sendError(res, 400, "Пользователь с таким email уже зарегистрирован.");
  }

  const user = {
    id: nextId(db.users),
    name,
    email,
    phone,
    passwordHash: hashPassword(password),
    isAdmin: false,
    date_joined: new Date().toISOString(),
    favoriteIds: [],
    orders: [],
  };

  const token = createToken();
  db.users.push(user);
  db.sessions[token] = user.id;
  writeDb(db);

  res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const db = readDb();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  const user = db.users.find(
    item => normalizeEmail(item.email) === email && item.passwordHash === hashPassword(password)
  );

  if (!user) {
    return sendError(res, 400, "Неверный email или пароль.");
  }

  const token = createToken();
  db.sessions[token] = user.id;
  writeDb(db);

  res.json({ token, user: sanitizeUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  const db = readDb();
  const token = parseToken(req);

  if (token && db.sessions[token]) {
    delete db.sessions[token];
    writeDb(db);
  }

  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const db = readDb();
  const session = requireUser(req, res, db);
  if (!session) {
    return;
  }

  res.json(sanitizeUser(session.user));
});

app.patch("/api/auth/me", (req, res) => {
  const db = readDb();
  const session = requireUser(req, res, db);
  if (!session) {
    return;
  }

  const nextName = String(req.body.name || "").trim();
  session.user.name = nextName || session.user.name;
  session.user.phone = String(req.body.phone || "").trim();
  writeDb(db);

  res.json(sanitizeUser(session.user));
});

app.get("/api/catalog/favorites", (req, res) => {
  const db = readDb();
  const session = requireUser(req, res, db);
  if (!session) {
    return;
  }

  const productMap = getProductMap(db);
  const favorites = session.user.favoriteIds
    .map(productId => productMap.get(productId))
    .filter(Boolean)
    .map(product => toProductView(db, product));

  res.json(favorites);
});

app.post("/api/catalog/favorites", (req, res) => {
  const db = readDb();
  const session = requireUser(req, res, db);
  if (!session) {
    return;
  }

  const productId = Number(req.body.productId || req.body.product_id);
  const product = db.products.find(item => item.id === productId);

  if (!product) {
    return sendError(res, 404, "Товар не найден.");
  }

  if (!session.user.favoriteIds.includes(productId)) {
    session.user.favoriteIds.unshift(productId);
    writeDb(db);
  }

  res.status(201).json(toProductView(db, product));
});

app.delete("/api/catalog/favorites/:productId", (req, res) => {
  const db = readDb();
  const session = requireUser(req, res, db);
  if (!session) {
    return;
  }

  const productId = Number(req.params.productId);
  session.user.favoriteIds = session.user.favoriteIds.filter(id => id !== productId);
  writeDb(db);

  res.json({ ok: true });
});

app.get("/api/orders", (req, res) => {
  const db = readDb();
  const session = requireUser(req, res, db);
  if (!session) {
    return;
  }

  res.json(sortedOrders(session.user.orders || []));
});

app.post("/api/orders", (req, res) => {
  const db = readDb();
  const session = requireUser(req, res, db);
  if (!session) {
    return;
  }

  const payload = req.body || {};
  const contactName = String(payload.contactName || payload.contact_name || "").trim();
  const phone = String(payload.phone || "").trim();
  const deliveryMethod = String(payload.deliveryMethod || payload.delivery_method || "pickup");
  const address = String(payload.address || "").trim();
  const comment = String(payload.comment || "").trim();
  const personalDataConsent = Boolean(
    payload.personalDataConsent ?? payload.personal_data_consent
  );
  const requestedItems = Array.isArray(payload.items) ? payload.items : [];

  if (!contactName) {
    return sendError(res, 400, "Укажите имя получателя.");
  }

  if (!phone) {
    return sendError(res, 400, "Укажите телефон.");
  }

  if (!personalDataConsent) {
    return sendError(res, 400, "Нужно согласие на обработку персональных данных.");
  }

  if (!requestedItems.length) {
    return sendError(res, 400, "Корзина пуста.");
  }

  if (deliveryMethod === "delivery" && !address) {
    return sendError(res, 400, "Укажите адрес доставки.");
  }

  const productMap = getProductMap(db);
  const items = requestedItems.map((item, index) => {
    const productId = Number(item.productId || item.product_id);
    const quantity = Number(item.quantity || item.qty || 0);
    const product = productMap.get(productId);

    if (!product) {
      throw new Error("Один из товаров больше недоступен.");
    }

    if (quantity <= 0) {
      throw new Error("Количество товара должно быть больше нуля.");
    }

    return {
      id: Date.now() + index,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: Number(product.price),
      weight: product.weight,
      imageUrl: product.imageUrl,
      qty: quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryPrice = deliveryMethod === "delivery" ? 300 : 0;
  const order = {
    id: nextId(session.user.orders || []),
    number: buildOrderNumber(db),
    status: "new",
    deliveryMethod,
    contactName,
    phone,
    address,
    comment,
    subtotal,
    deliveryPrice,
    total: subtotal + deliveryPrice,
    personalDataConsent,
    createdAt: new Date().toISOString(),
    items,
  };

  session.user.orders = [order, ...(session.user.orders || [])];
  writeDb(db);

  res.status(201).json(order);
});

app.post("/api/feedback", (req, res) => {
  const db = readDb();
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = String(req.body.phone || "").trim();
  const message = String(req.body.message || "").trim();
  const personalDataConsent = Boolean(
    req.body.personalDataConsent ?? req.body.personal_data_consent
  );

  if (!name || !email || !message) {
    return sendError(res, 400, "Заполните форму полностью.");
  }

  if (!personalDataConsent) {
    return sendError(res, 400, "Нужно согласие на обработку персональных данных.");
  }

  db.feedback.unshift({
    id: nextId(db.feedback),
    name,
    email,
    phone,
    message,
    personalDataConsent: true,
    created_at: new Date().toISOString(),
  });
  writeDb(db);

  res.status(201).json({ ok: true });
});

app.get("/api/admin/dashboard", (req, res) => {
  const db = readDb();
  const session = requireAdmin(req, res, db);
  if (!session) {
    return;
  }

  const products = db.products.map(product => toProductView(db, product));
  const users = db.users.map(user => ({
    ...sanitizeUser(user),
    favoritesCount: user.favoriteIds.length,
    ordersCount: user.orders.length,
    totalSpent: user.orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
  }));
  const orders = db.users
    .flatMap(user =>
      user.orders.map(order => ({
        ...order,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      }))
    )
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  res.json({
    categories: buildCategoriesWithCounts(db),
    products,
    users,
    orders,
    feedback: clone(db.feedback),
  });
});

app.post("/api/admin/products", (req, res) => {
  const db = readDb();
  const session = requireAdmin(req, res, db);
  if (!session) {
    return;
  }

  const payload = req.body || {};
  const name = String(payload.name || "").trim();
  const categorySlug = String(payload.categorySlug || "cakes");

  if (!name) {
    return sendError(res, 400, "Укажите название товара.");
  }

  const currentId = payload.id ? Number(payload.id) : nextId(db.products);
  const product = {
    id: currentId,
    slug: String(payload.slug || name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9а-яё\s-]/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
    name,
    description: String(payload.description || "").trim(),
    price: Number(payload.price) || 0,
    originalPrice: payload.originalPrice ? Number(payload.originalPrice) : null,
    weight: String(payload.weight || "").trim(),
    imageUrl: String(payload.imageUrl || "").trim(),
    badge: String(payload.badge || "").trim(),
    badgeLabel: String(payload.badgeLabel || "").trim(),
    allergens: String(payload.allergens || "").trim(),
    isMonthPick: Boolean(payload.isMonthPick),
    categorySlug,
  };

  const existingIndex = db.products.findIndex(item => item.id === currentId);
  if (existingIndex >= 0) {
    db.products[existingIndex] = product;
  } else {
    db.products.unshift(product);
  }

  writeDb(db);
  res.status(existingIndex >= 0 ? 200 : 201).json(toProductView(db, product));
});

app.delete("/api/admin/products/:productId", (req, res) => {
  const db = readDb();
  const session = requireAdmin(req, res, db);
  if (!session) {
    return;
  }

  const productId = Number(req.params.productId);
  db.products = db.products.filter(product => product.id !== productId);
  db.users.forEach(user => {
    user.favoriteIds = user.favoriteIds.filter(id => id !== productId);
  });
  writeDb(db);

  res.json({ ok: true });
});

app.put("/api/admin/users/:userId", (req, res) => {
  const db = readDb();
  const session = requireAdmin(req, res, db);
  if (!session) {
    return;
  }

  const userId = Number(req.params.userId);
  const user = db.users.find(item => item.id === userId);
  if (!user) {
    return sendError(res, 404, "Пользователь не найден.");
  }

  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);

  if (!name) {
    return sendError(res, 400, "Укажите имя пользователя.");
  }

  if (!email) {
    return sendError(res, 400, "Укажите email пользователя.");
  }

  if (db.users.some(item => item.id !== userId && normalizeEmail(item.email) === email)) {
    return sendError(res, 400, "Такой email уже используется.");
  }

  const nextIsAdmin = Boolean(req.body.isAdmin);
  if (session.user.id === userId && !nextIsAdmin) {
    return sendError(res, 400, "Нельзя снять права администратора у текущего аккаунта.");
  }

  user.name = name;
  user.email = email;
  user.phone = String(req.body.phone || "").trim();
  user.isAdmin = nextIsAdmin;
  writeDb(db);

  res.json(sanitizeUser(user));
});

app.delete("/api/admin/users/:userId", (req, res) => {
  const db = readDb();
  const session = requireAdmin(req, res, db);
  if (!session) {
    return;
  }

  const userId = Number(req.params.userId);
  if (session.user.id === userId) {
    return sendError(res, 400, "Нельзя удалить текущего администратора.");
  }

  db.users = db.users.filter(user => user.id !== userId);
  Object.keys(db.sessions).forEach(token => {
    if (db.sessions[token] === userId) {
      delete db.sessions[token];
    }
  });
  writeDb(db);

  res.json({ ok: true });
});

app.patch("/api/admin/orders/:userId/:orderId", (req, res) => {
  const db = readDb();
  const session = requireAdmin(req, res, db);
  if (!session) {
    return;
  }

  const userId = Number(req.params.userId);
  const orderId = Number(req.params.orderId);
  const status = String(req.body.status || "");

  const user = db.users.find(item => item.id === userId);
  if (!user) {
    return sendError(res, 404, "Пользователь заказа не найден.");
  }

  const order = user.orders.find(item => item.id === orderId);
  if (!order) {
    return sendError(res, 404, "Заказ не найден.");
  }

  order.status = status || order.status;
  writeDb(db);

  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError) {
    return sendError(res, 400, "Некорректный JSON в запросе.");
  }

  if (err instanceof Error) {
    return sendError(res, 400, err.message);
  }

  return sendError(res, 500, "Внутренняя ошибка сервера.");
});

app.listen(PORT, () => {
  ensureDatabase();
  console.log(`SweetHand API запущен: http://127.0.0.1:${PORT}/api`);
});
