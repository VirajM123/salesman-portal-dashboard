import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import dns from "node:dns";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";

const requiredEnv = ["MONGODB_URI", "MONGODB_DB", "SESSION_SECRET"];
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const mongoDnsServers = String(process.env.MONGODB_DNS_SERVERS || "")
  .split(",")
  .map(server => server.trim())
  .filter(Boolean);
if (mongoDnsServers.length) dns.setServers(mongoDnsServers);

const app = express();
const port = Number(process.env.PORT || process.env.SERVER_PORT || 4000);
//const port = Number(process.env.SERVER_PORT || 4000);
const cookieName = "totalapp_session";
const mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
let databasePromise;
const collectionCache = new Map();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

function getDatabase() {
  if (!databasePromise) {
    databasePromise = mongo.connect().then(client => client.db(process.env.MONGODB_DB));
  }
  return databasePromise;
}

async function getCollection(logicalName) {
  if (collectionCache.has(logicalName)) return collectionCache.get(logicalName);
  const db = await getDatabase();
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const normalized = logicalName.toLowerCase();
  const match = collections.find(item => item.name.toLowerCase() === normalized);
  if (!match) throw Object.assign(new Error(`Collection ${logicalName} was not found`), { status: 503 });
  const collection = db.collection(match.name);
  collectionCache.set(logicalName, collection);
  return collection;
}

const normalizeField = value => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const identifierAliases = new Set(["username", "userid", "login", "loginid", "loginname", "email", "emailid", "mobile", "mobileno", "phone", "phoneno", "phonenumber", "distributorcode", "distributorid", "distcode", "sysaccode"]);
const passwordAliases = new Set(["password", "pass", "pwd", "userpass", "userpassword", "loginpassword"]);
const distributorAliases = new Set(["distributorid", "distributorcode", "distributor", "distid", "distcode", "sysaccode"]);

function matchingFields(document, aliases) {
  return Object.keys(document || {}).filter(field => aliases.has(normalizeField(field)));
}

function firstMatchingField(document, orderedAliases) {
  const fields = Object.keys(document || {});
  for (const alias of orderedAliases) {
    const match = fields.find(field => normalizeField(field) === alias);
    if (match) return match;
  }
  return undefined;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function passwordMatches(supplied, stored) {
  if (typeof stored !== "string" && typeof stored !== "number") return false;
  const value = String(stored);
  if (/^\$2[aby]\$/.test(value)) return bcrypt.compare(supplied, value);
  return safeEqual(supplied, value);
}

function serialize(value) {
  if (value instanceof ObjectId) return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !/pass|pwd|secret|token/i.test(key))
      .map(([key, nested]) => [key, serialize(nested)]));
  }
  return value;
}

function scopeValues(distributorId) {
  const values = [distributorId];
  if (ObjectId.isValid(distributorId)) values.push(new ObjectId(distributorId));
  if (/^-?\d+(\.\d+)?$/.test(distributorId)) values.push(Number(distributorId));
  return values;
}

function signSession(distributor) {
  return jwt.sign(distributor, process.env.SESSION_SECRET, { expiresIn: "8h", issuer: "salesman-portal" });
}

function requireAuth(req, res, next) {
  try {
    req.session = jwt.verify(req.cookies[cookieName], process.env.SESSION_SECRET, { issuer: "salesman-portal" });
    next();
  } catch {
    res.status(401).json({ error: "Authentication required." });
  }
}

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });

app.get("/api/health", async (_req, res, next) => {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.post("/api/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const identifier = String(req.body?.identifier || "").trim();
    const password = String(req.body?.password || "");
    if (!identifier || !password) return res.status(400).json({ error: "Username and password are required." });

    // Mobile-app credentials live in Mas_Register. mas_distributor is the
    // password-free profile used to validate and scope the portal session.
    const collection = await getCollection("Mas_Register");
    const sample = await collection.findOne({ password: { $exists: true } });
    const identifierFields = matchingFields(sample, identifierAliases);
    const passwordFields = matchingFields(sample, passwordAliases);
    if (!identifierFields.length || !passwordFields.length) {
      return res.status(503).json({ error: "Login fields could not be identified in Mas_Register." });
    }

    const exactIdentifier = new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const identifierValues = [exactIdentifier, identifier];
    if (/^-?\d+(\.\d+)?$/.test(identifier)) identifierValues.push(Number(identifier));
    const registration = await collection.findOne({
      $and: [
        { $or: identifierFields.flatMap(field => identifierValues.map(value => ({ [field]: value }))) },
        { isActive: { $ne: false } },
        { $or: [
          { role: /^distributor$/i },
          { accountType: /^distributor$/i }
        ] }
      ]
    });
    if (!registration) return res.status(401).json({ error: "Invalid login details or inactive distributor account." });

    const validPassword = await Promise.any(passwordFields.map(async field => {
      if (await passwordMatches(password, registration[field])) return true;
      throw new Error("not matched");
    })).catch(() => false);
    if (!validPassword) return res.status(401).json({ error: "Invalid login details." });

    const registrationDistributorField = firstMatchingField(registration, ["distributorid", "distid", "distributorcode", "distcode", "sysaccode", "distributor"]);
    if (!registrationDistributorField || registration[registrationDistributorField] == null) {
      return res.status(403).json({ error: "This login is not linked to a distributor profile." });
    }

    const distributorId = String(registration[registrationDistributorField]);
    const profiles = await getCollection("mas_distributor");
    const profile = await profiles.findOne({
      distributor_id: { $in: scopeValues(distributorId) },
      isActive: { $ne: false }
    });
    if (!profile) return res.status(403).json({ error: "The linked distributor profile is missing or inactive." });

    const displayField = Object.keys(profile).find(field => /^(name|distributorname|companyname|firmname)$/i.test(normalizeField(field)));
    const session = { sub: String(registration._id), distributorId, name: displayField ? String(profile[displayField]) : identifier };
    res.cookie(cookieName, signSession(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/"
    });
    res.json({ user: session });
  } catch (error) { next(error); }
});

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: req.session }));
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(cookieName, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  res.status(204).end();
});

async function sendDistributorRecords(req, res, next, logicalName, { paginate = false, distributorField } = {}) {
  try {
    const collection = await getCollection(logicalName);
    const sample = await collection.findOne({});
    const distributorFields = distributorField ? [distributorField] : matchingFields(sample, distributorAliases);
    if (!distributorFields.length) {
      return res.status(503).json({ error: `${logicalName} does not contain a recognized distributor ID field.` });
    }
    const values = scopeValues(String(req.session.distributorId));
    const distributorQuery = { $or: distributorFields.flatMap(field => values.map(value => ({ [field]: value }))) };
    if (paginate) {
      const pageSize = 100;
      const requestedPage = Number.parseInt(String(req.query.page || "1"), 10);
      const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
      const search = String(req.query.search || "").trim().slice(0, 100);
      const area = String(req.query.area || "").trim().slice(0, 100);
      const status = String(req.query.status || "").trim().slice(0, 30);
      const createdDate = String(req.query.createdDate || "").trim();
      const searchableFields = Object.keys(sample || {}).filter(field =>
        !/pass|pwd|secret|token|distributor/i.test(field) && typeof sample[field] === "string"
      );
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const filters = [];
      if (search && searchableFields.length) filters.push({ $or: searchableFields.map(field => ({ [field]: new RegExp(escapedSearch, "i") })) });
      if (area) filters.push({ area });
      if (status) filters.push({ status:new RegExp(`^${status.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
      if (/^\d{4}-\d{2}-\d{2}$/.test(createdDate)) filters.push({ created_at:new RegExp(`^${createdDate}`) });
      const query = filters.length ? { $and:[distributorQuery, ...filters] } : distributorQuery;
      const [allTotal, activeTotal, inactiveTotal, total, areas] = await Promise.all([
        collection.countDocuments(distributorQuery),
        collection.countDocuments({ $and:[distributorQuery, { status:/^active$/i }] }),
        collection.countDocuments({ $and:[distributorQuery, { status:/^inactive$/i }] }),
        collection.countDocuments(query),
        collection.distinct("area", distributorQuery)
      ]);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const currentPage = Math.min(page, totalPages);
      const records = await collection.find(query)
        .sort({ _id: 1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .toArray();
      return res.json({ records: records.map(serialize), count: records.length, total, allTotal, activeTotal, inactiveTotal, areas:areas.filter(Boolean).sort(), page: currentPage, pageSize, totalPages });
    }

    const records = await collection.find(distributorQuery).limit(500).toArray();
    res.json({ records: records.map(serialize), count: records.length });
  } catch (error) { next(error); }
}

app.get("/api/customers", requireAuth, (req, res, next) => sendDistributorRecords(req, res, next, "mas_customer", { paginate: true, distributorField: "distributor_id" }));
app.get("/api/salesmen", requireAuth, (req, res, next) => sendDistributorRecords(req, res, next, "mas_salesman"));

function deliveryBillStatus(bill) {
  return String(bill?.delivery_status ?? bill?.status ?? "pending").trim().toLowerCase();
}

function validCoordinate(value, minimum, maximum) {
  const number = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}

function documentValue(document, aliases) {
  const field = firstMatchingField(document || {}, aliases);
  return field ? document[field] : undefined;
}

function deliveryAssignment(delivery) {
  const embedded = delivery?.assignedSalesman && typeof delivery.assignedSalesman === "object"
    ? delivery.assignedSalesman
    : {};
  const id = embedded.id ?? embedded.salesmanId ?? documentValue(delivery, ["salesmanid", "assignedsalesmanid"]);
  const name = embedded.name ?? embedded.salesmanName ?? documentValue(delivery, ["salesmanname", "assignedsalesmanname"]);
  if (id == null && !name) return null;
  return {
    id: id == null ? "" : String(id),
    name: String(name || "Assigned salesman"),
    assignedAt: serialize(embedded.assignedAt ?? delivery.assignedAt ?? null)
  };
}

function normalizeAssignedSalesman(record, assignment) {
  if (!assignment) return null;
  if (!record) return assignment;
  const latitude = Number.parseFloat(String(documentValue(record, ["geolatitude", "currentlatitude", "latitude", "lat"]) ?? ""));
  const longitude = Number.parseFloat(String(documentValue(record, ["geolongitude", "currentlongitude", "longitude", "lng", "lon"]) ?? ""));
  const hasLocation = validCoordinate(latitude, -90, 90) && validCoordinate(longitude, -180, 180);
  return {
    ...assignment,
    name: String(documentValue(record, ["salesmanname", "fullname", "name", "username"]) || assignment.name),
    phone: String(documentValue(record, ["mobile", "mobileno", "phone", "phoneno"]) || ""),
    pos: hasLocation ? { lat: latitude, lng: longitude } : null,
    speed: Number(documentValue(record, ["speed", "currentspeed"]) || 0),
    battery: Number(documentValue(record, ["battery", "batterylevel"]) || 0)
  };
}

function normalizeDelivery(delivery) {
  const bills = Array.isArray(delivery.bills) ? delivery.bills : [];
  const normalizedBills = bills.map((bill, index) => {
    const lat = Number.parseFloat(String(bill.GeoLatitude ?? "").trim());
    const lng = Number.parseFloat(String(bill.GeoLongitude ?? "").trim());
    const hasLocation = validCoordinate(lat, -90, 90) && validCoordinate(lng, -180, 180);
    return {
      sequence: index + 1,
      trnSeries: String(bill.TrnSeries ?? ""),
      trnNo: bill.TrnNo ?? null,
      customerCode: String(bill.SysAcCode ?? ""),
      customerName: String(bill.AcName ?? "Customer"),
      billAmount: Number(bill.BillAmount ?? 0),
      status: deliveryBillStatus(bill),
      hasLocation,
      lat: hasLocation ? lat : null,
      lng: hasLocation ? lng : null
    };
  });
  const deliveredBills = normalizedBills.filter(bill => /^(delivered|complete|completed|success)$/.test(bill.status)).length;
  const mappedBills = normalizedBills.filter(bill => bill.hasLocation).length;
  return {
    id: String(delivery._id),
    loadSeries: String(delivery.LoadSeries ?? ""),
    loadNo: delivery.LoadNo ?? "",
    uploadedAt: serialize(delivery.uploadedAt ?? delivery.createdAt ?? delivery.created_at),
    totalBills: normalizedBills.length,
    deliveredBills,
    pendingBills: Math.max(0, normalizedBills.length - deliveredBills),
    mappedBills,
    totalAmount: normalizedBills.reduce((sum, bill) => sum + (Number.isFinite(bill.billAmount) ? bill.billAmount : 0), 0),
    assignedSalesman: deliveryAssignment(delivery),
    bills: normalizedBills
  };
}

app.get("/api/deliveries", requireAuth, async (req, res, next) => {
  try {
    const collection = await getCollection("Mas_Delivery");
    const sample = await collection.findOne({});
    const distributorFields = matchingFields(sample, distributorAliases);
    if (!distributorFields.length) return res.status(503).json({ error: "Mas_Delivery does not contain a recognized distributor ID field." });

    const distributorValues = scopeValues(String(req.session.distributorId));
    const distributorQuery = { $or: distributorFields.flatMap(field => distributorValues.map(value => ({ [field]: value }))) };
    const requestedPage = Number.parseInt(String(req.query.page || "1"), 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const requestedPageSize = Number.parseInt(String(req.query.pageSize || "20"), 10);
    const pageSize = Math.min(100, Math.max(10, Number.isFinite(requestedPageSize) ? requestedPageSize : 20));
    const search = String(req.query.search || "").trim().slice(0, 100);
    const series = String(req.query.series || "").trim().slice(0, 40);
    const progress = String(req.query.progress || "").trim();
    const location = String(req.query.location || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const filters = [distributorQuery];

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchConditions = [
        { LoadSeries: new RegExp(escaped, "i") },
        { "bills.AcName": new RegExp(escaped, "i") },
        { "bills.SysAcCode": new RegExp(escaped, "i") },
        { "bills.TrnSeries": new RegExp(escaped, "i") }
      ];
      if (/^\d+$/.test(search)) searchConditions.push({ LoadNo: { $in: [Number(search), search] } }, { "bills.TrnNo": { $in: [Number(search), search] } });
      filters.push({ $or: searchConditions });
    }
    if (series === "__blank__") filters.push({ $or: [{ LoadSeries: "" }, { LoadSeries: null }, { LoadSeries: { $exists: false } }] });
    else if (series) filters.push({ LoadSeries: new RegExp(`^${series.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) filters.push({ uploadedAt: { $gte: new Date(`${from}T00:00:00.000Z`) } });
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) filters.push({ uploadedAt: { $lte: new Date(`${to}T23:59:59.999Z`) } });
    const billsExpression = { $cond: [{ $isArray: "$bills" }, "$bills", []] };
    const deliveredExpression = { $size: { $filter: { input: billsExpression, as: "bill", cond: { $in: [{ $toLower: { $toString: { $ifNull: ["$$bill.delivery_status", { $ifNull: ["$$bill.status", "pending"] }] } } }, ["delivered", "complete", "completed", "success"]] } } } };
    const billCountExpression = { $size: billsExpression };
    const mappedExpression = { $size: { $filter: { input: billsExpression, as: "bill", cond: { $let: { vars: {
      lat: { $convert: { input: "$$bill.GeoLatitude", to: "double", onError: null, onNull: null } },
      lng: { $convert: { input: "$$bill.GeoLongitude", to: "double", onError: null, onNull: null } }
    }, in: { $and: [{ $ne: ["$$lat", null] }, { $gte: ["$$lat", -90] }, { $lte: ["$$lat", 90] }, { $ne: ["$$lng", null] }, { $gte: ["$$lng", -180] }, { $lte: ["$$lng", 180] }] } } } } } };
    if (progress === "complete") filters.push({ $expr: { $and: [{ $gt: [billCountExpression, 0] }, { $eq: [deliveredExpression, billCountExpression] }] } });
    else if (progress === "not-started") filters.push({ $expr: { $eq: [deliveredExpression, 0] } });
    else if (progress === "in-progress") filters.push({ $expr: { $and: [{ $gt: [deliveredExpression, 0] }, { $lt: [deliveredExpression, billCountExpression] }] } });
    if (location === "none") filters.push({ "bills": { $not: { $elemMatch: { GeoLatitude: { $nin: [null, ""] }, GeoLongitude: { $nin: [null, ""] } } } } });
    else if (location === "mapped") filters.push({ "bills.0": { $exists: true }, "bills": { $not: { $elemMatch: { $or: [{ GeoLatitude: { $in: [null, ""] } }, { GeoLongitude: { $in: [null, ""] } }] } } } });
    else if (location === "partial") filters.push({ "bills": { $elemMatch: { GeoLatitude: { $nin: [null, ""] }, GeoLongitude: { $nin: [null, ""] } } }, $or: [{ "bills.GeoLatitude": { $in: [null, ""] } }, { "bills.GeoLongitude": { $in: [null, ""] } }] });

    const query = filters.length === 1 ? distributorQuery : { $and: filters };
    const sortOptions = {
      oldest: { uploadedAt: 1, _id: 1 },
      "load-asc": { LoadNo: 1, _id: 1 },
      "load-desc": { LoadNo: -1, _id: -1 },
      newest: { uploadedAt: -1, _id: -1 }
    };
    const sort = sortOptions[String(req.query.sort || "newest")] || sortOptions.newest;
    const [total, summaryResult, seriesValues] = await Promise.all([
      collection.countDocuments(query),
      collection.aggregate([
        { $match: distributorQuery },
        { $project: { totalBills: billCountExpression, deliveredBills: deliveredExpression, mappedBills: mappedExpression } },
        { $group: {
          _id: null,
          totalLoads: { $sum: 1 },
          completedLoads: { $sum: { $cond: [{ $and: [{ $gt: ["$totalBills", 0] }, { $eq: ["$deliveredBills", "$totalBills"] }] }, 1, 0] } },
          inProgressLoads: { $sum: { $cond: [{ $and: [{ $gt: ["$deliveredBills", 0] }, { $lt: ["$deliveredBills", "$totalBills"] }] }, 1, 0] } },
          pendingLoads: { $sum: { $cond: [{ $eq: ["$deliveredBills", 0] }, 1, 0] } },
          totalBills: { $sum: "$totalBills" },
          deliveredBills: { $sum: "$deliveredBills" },
          mappedBills: { $sum: "$mappedBills" }
        } }
      ]).toArray(),
      collection.distinct("LoadSeries", distributorQuery)
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const deliveries = await collection.find(query).sort(sort).skip((currentPage - 1) * pageSize).limit(pageSize).toArray();
    const totals = summaryResult[0] || { totalLoads: 0, totalBills: 0, deliveredBills: 0, mappedBills: 0 };
    res.json({
      records: deliveries.map(normalizeDelivery),
      page: currentPage,
      pageSize,
      total,
      totalPages,
      series: seriesValues.map(value => String(value ?? "")).sort(),
      summary: {
        totalLoads: totals.totalLoads,
        completedLoads: totals.completedLoads || 0,
        inProgressLoads: totals.inProgressLoads || 0,
        pendingLoads: totals.pendingLoads || 0,
        totalBills: totals.totalBills,
        deliveredBills: totals.deliveredBills,
        pendingBills: Math.max(0, totals.totalBills - totals.deliveredBills),
        mappedBills: totals.mappedBills
      }
    });
  } catch (error) { next(error); }
});

app.patch("/api/deliveries/:id/assignment", requireAuth, async (req, res, next) => {
  try {
    const deliveryId = String(req.params.id || "");
    const salesmanId = String(req.body?.salesmanId || "").trim();
    if (!ObjectId.isValid(deliveryId)) return res.status(400).json({ error: "Invalid load ID." });
    if (!ObjectId.isValid(salesmanId)) return res.status(400).json({ error: "Select a valid salesman." });

    const [deliveries, salesmen] = await Promise.all([getCollection("Mas_Delivery"), getCollection("mas_salesman")]);
    const [deliverySample, salesmanSample] = await Promise.all([deliveries.findOne({}), salesmen.findOne({})]);
    const deliveryDistributorFields = matchingFields(deliverySample, distributorAliases);
    const salesmanDistributorFields = matchingFields(salesmanSample, distributorAliases);
    if (!deliveryDistributorFields.length || !salesmanDistributorFields.length) {
      return res.status(503).json({ error: "Distributor fields are not available for load assignment." });
    }
    const distributorValues = scopeValues(String(req.session.distributorId));
    const salesman = await salesmen.findOne({
      $and: [
        { _id: new ObjectId(salesmanId) },
        { $or: salesmanDistributorFields.flatMap(field => distributorValues.map(value => ({ [field]: value }))) }
      ]
    });
    if (!salesman) return res.status(404).json({ error: "That salesman is not available for this distributor." });

    const name = String(documentValue(salesman, ["salesmanname", "fullname", "name", "username"]) || "Salesman");
    const assignedSalesman = { id: salesmanId, name, assignedAt: new Date() };
    const result = await deliveries.updateOne({
      $and: [
        { _id: new ObjectId(deliveryId) },
        { $or: deliveryDistributorFields.flatMap(field => distributorValues.map(value => ({ [field]: value }))) }
      ]
    }, { $set: { assignedSalesman } });
    if (!result.matchedCount) return res.status(404).json({ error: "Load not found for this distributor." });
    res.json({ assignedSalesman: normalizeAssignedSalesman(salesman, deliveryAssignment({ assignedSalesman })) });
  } catch (error) { next(error); }
});

app.get("/api/deliveries/track", requireAuth, async (req, res, next) => {
  try {
    const loadSeries = String(req.query.loadSeries ?? "").trim().slice(0, 40);
    const loadNoText = String(req.query.loadNo ?? "").trim();
    if (!/^\d+$/.test(loadNoText)) return res.status(400).json({ error: "Enter a valid load number." });

    const collection = await getCollection("Mas_Delivery");
    const sample = await collection.findOne({});
    const distributorFields = matchingFields(sample, distributorAliases);
    if (!distributorFields.length) return res.status(503).json({ error: "Mas_Delivery does not contain a recognized distributor ID field." });
    const escapedSeries = loadSeries.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const loadNo = Number(loadNoText);
    const query = {
      $and: [
        { $or: distributorFields.flatMap(field => scopeValues(String(req.session.distributorId)).map(value => ({ [field]: value }))) },
        { LoadNo: { $in: [loadNo, loadNoText] } },
        loadSeries
          ? { LoadSeries: new RegExp(`^${escapedSeries}$`, "i") }
          : { $or: [{ LoadSeries: "" }, { LoadSeries: null }, { LoadSeries: { $exists: false } }] }
      ]
    };
    const delivery = await collection.findOne(query);
    if (!delivery) return res.status(404).json({ error: "No load was found for this series and load number." });

    const bills = Array.isArray(delivery.bills) ? delivery.bills : [];
    const stops = bills.map((bill, index) => {
      const lat = Number.parseFloat(String(bill.GeoLatitude ?? "").trim());
      const lng = Number.parseFloat(String(bill.GeoLongitude ?? "").trim());
      return {
        sequence: index + 1,
        trnSeries: String(bill.TrnSeries ?? ""),
        trnNo: bill.TrnNo ?? null,
        customerCode: String(bill.SysAcCode ?? ""),
        customerName: String(bill.AcName ?? "Customer"),
        billAmount: Number(bill.BillAmount ?? 0),
        status: String(bill.delivery_status ?? "pending"),
        lat: Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null,
        lng: Number.isFinite(lng) && lng >= -180 && lng <= 180 ? lng : null
      };
    });
    const mappedStops = stops.filter(stop => stop.lat != null && stop.lng != null);
    const deliveredBills = stops.filter(stop => /^(delivered|complete|completed|success)$/i.test(stop.status)).length;
    const assignment = deliveryAssignment(delivery);
    let assignedSalesman = assignment;
    if (assignment?.id && ObjectId.isValid(assignment.id)) {
      try {
        const salesmen = await getCollection("mas_salesman");
        const salesmanSample = await salesmen.findOne({});
        const salesmanDistributorFields = matchingFields(salesmanSample, distributorAliases);
        const salesman = salesmanDistributorFields.length ? await salesmen.findOne({
          $and: [
            { _id: new ObjectId(assignment.id) },
            { $or: salesmanDistributorFields.flatMap(field => scopeValues(String(req.session.distributorId)).map(value => ({ [field]: value }))) }
          ]
        }) : null;
        assignedSalesman = normalizeAssignedSalesman(salesman, assignment);
      } catch {
        assignedSalesman = assignment;
      }
    }
    res.json({
      load: {
        id: String(delivery._id),
        loadSeries: String(delivery.LoadSeries ?? ""),
        loadNo: delivery.LoadNo,
        uploadedAt: serialize(delivery.uploadedAt),
        totalBills: bills.length,
        deliveredBills,
        pendingBills: Math.max(0,bills.length-deliveredBills),
        mappedBills: mappedStops.length,
        assignedSalesman,
        stops: mappedStops
      }
    });
  } catch (error) { next(error); }
});

if (process.env.NODE_ENV === "production") {
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
  app.use(express.static(directory));
  app.use((req, res, next) => req.method === "GET" && !req.path.startsWith("/api/") ? res.sendFile(path.join(directory, "index.html")) : next());
}

app.use((error, _req, res, _next) => {
  console.error("Request failed:", error.message);
  res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to complete the request." });
});

app.listen(port, () => console.log(`API server listening on http://localhost:${port}`));
