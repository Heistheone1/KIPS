'use strict';

/**
 * pg-odm — a small Mongoose-compatible document ODM backed by PostgreSQL JSONB.
 *
 * Why: the KIPS-SMS service layer was written against Mongoose. Rather than
 * rewriting every business rule, this module provides the exact subset of the
 * Mongoose API the application uses, while persisting documents in PostgreSQL.
 *
 * Storage model: one row per document in `documents`
 *   (id text pk, collection text, data jsonb, created_at, updated_at)
 *
 * Supported API (deliberately scoped to what the app uses):
 *   defineModel(name, options) -> Model
 *   Model: create, insertMany, find, findOne, findById, findOneAndUpdate,
 *          findByIdAndUpdate, findByIdAndDelete, updateOne, updateMany,
 *          deleteOne, deleteMany, countDocuments, distinct, aggregate, exists
 *   Query: select, populate, sort, skip, limit, lean, exec (thenable)
 *   Document: save, set, toObject, toJSON, isModified, custom methods,
 *             virtuals, statics
 *   connect, disconnect, connection.readyState, Types.ObjectId
 */

const crypto = require('crypto');
const { Pool } = require('pg');

// ─── Errors ────────────────────────────────────────────────────────────────

const castError = (value) => {
  const err = new Error(`Cast to ObjectId failed for value "${value}"`);
  err.name = 'CastError';
  err.path = '_id';
  err.value = value;
  return err;
};

const duplicateError = (fields, values) => {
  const err = new Error(`E11000 duplicate key error: ${fields.join('_')}`);
  err.name = 'MongoServerError';
  err.code = 11000;
  err.keyValue = values;
  return err;
};

// ─── ObjectId ──────────────────────────────────────────────────────────────

const HEX24 = /^[0-9a-fA-F]{24}$/;
const generateId = () => crypto.randomBytes(12).toString('hex');

function ObjectId(value) {
  if (!(this instanceof ObjectId)) return new ObjectId(value);
  if (value === undefined || value === null) {
    this._id = generateId();
  } else if (value instanceof ObjectId) {
    this._id = value._id;
  } else if (typeof value === 'string') {
    if (!HEX24.test(value)) throw castError(value);
    this._id = value.toLowerCase();
  } else if (value && typeof value === 'object' && typeof value._id === 'string') {
    this._id = value._id;
  } else {
    throw castError(value);
  }
}
ObjectId.prototype.toString = function toString() {
  return this._id;
};
ObjectId.prototype.toJSON = function toJSON() {
  return this._id;
};
ObjectId.prototype.valueOf = function valueOf() {
  return this._id;
};
ObjectId.prototype.equals = function equals(other) {
  return String(other) === this._id;
};
ObjectId.isValid = (value) => HEX24.test(String(value));
ObjectId.createFromHexString = (value) => new ObjectId(value);

const isObjectIdLike = (value) =>
  value instanceof ObjectId ||
  (value && typeof value === 'object' && typeof value._id === 'string' &&
    value.constructor && value.constructor.name === 'ObjectId');

// Normalize any id-ish value (or array of them) to a plain string.
const asId = (value) => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(asId);
  if (value instanceof ObjectId) return value.toString();
  if (isObjectIdLike(value)) return value._id;
  if (typeof value === 'object' && typeof value._id === 'string') return value._id;
  return value;
};

// ─── Connection ────────────────────────────────────────────────────────────

let pool = null;
let readyState = 0;
let initPromise = null;

const resolveConnectionString = () => {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URI ||
    (() => {
      try {
        return require('../config/env').DATABASE_URL;
      } catch (_) {
        return null;
      }
    })();
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }
  return url;
};

const ensureReady = async () => {
  if (readyState === 1 && pool) return pool;
  if (initPromise) {
    await initPromise;
    return pool;
  }
  readyState = 2;
  initPromise = (async () => {
    pool = new Pool({ connectionString: resolveConnectionString() });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id text PRIMARY KEY,
        collection text NOT NULL,
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(
      'CREATE INDEX IF NOT EXISTS documents_collection_idx ON documents (collection)'
    );
    readyState = 1;
  })();
  try {
    await initPromise;
  } catch (err) {
    readyState = 0;
    initPromise = null;
    throw err;
  }
  return pool;
};

const connect = async () => {
  if (readyState === 1) return module.exports;
  await ensureReady();
  return module.exports;
};

const disconnect = async () => {
  if (pool) {
    await pool.end();
  }
  pool = null;
  readyState = 0;
  initPromise = null;
};

// ─── Document helpers ──────────────────────────────────────────────────────

const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  (v.constructor === Object || v.constructor === undefined);

const isDocument = (v) => !!(v && v.__isPgoDoc);

/** Deep-convert dates / ObjectIds / documents into JSON-safe values. */
const toPlain = (value) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ObjectId) return value.toString();
  if (isDocument(value)) return toPlain(value.__data);
  if (Array.isArray(value)) return value.map(toPlain);
  if (isPlainObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = toPlain(v);
    }
    return out;
  }
  return value;
};

const clone = (value) => {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(toPlain(value)));
};

const normalizeValue = (value) => {
  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  return value;
};

// Resolve a dotted path, flattening arrays (Mongo-style multi-value lookup).
const getValues = (obj, path) => {
  const parts = String(path).split('.');
  let current = [obj];
  for (const part of parts) {
    const next = [];
    for (const item of current) {
      if (item === null || item === undefined) continue;
      if (Array.isArray(item)) {
        for (const el of item) {
          if (el === null || el === undefined) continue;
          if (typeof el === 'object' && part in el) next.push(el[part]);
        }
      } else if (typeof item === 'object' && part in item) {
        next.push(item[part]);
      }
    }
    current = next;
  }
  return current;
};

const flatten = (values) => {
  const out = [];
  for (const v of values) {
    if (Array.isArray(v)) out.push(...flatten(v));
    else out.push(v);
  }
  return out;
};

const setPath = (obj, path, value) => {
  const parts = String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (cur[key] === null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
};

const unsetPath = (obj, path) => {
  const parts = String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (cur[key] === null || typeof cur[key] !== 'object') return;
    cur = cur[key];
  }
  delete cur[parts[parts.length - 1]];
};

const valueEquals = (docValue, condValue) => {
  const a = normalizeValue(docValue);
  const b = normalizeValue(condValue);
  if (a === b) return true;
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (_) {
      return false;
    }
  }
  return false;
};

const matchOperator = (docValue, op, operand, rawDocValue) => {
  const values = flatten([docValue]);
  switch (op) {
    case '$eq':
      return values.some((v) => valueEquals(v, operand)) ||
        (Array.isArray(rawDocValue) && Array.isArray(operand) &&
          JSON.stringify(rawDocValue) === JSON.stringify(operand));
    case '$ne':
      return !matchOperator(docValue, '$eq', operand, rawDocValue);
    case '$in':
      return (operand || []).some((candidate) =>
        values.some((v) => valueEquals(v, candidate))
      );
    case '$nin':
      return !matchOperator(docValue, '$in', operand, rawDocValue);
    case '$exists':
      return operand ? values.length > 0 : values.length === 0;
    case '$gt':
      return values.some((v) => compareValues(v, operand) > 0);
    case '$gte':
      return values.some((v) => compareValues(v, operand) >= 0);
    case '$lt':
      return values.some((v) => compareValues(v, operand) < 0);
    case '$lte':
      return values.some((v) => compareValues(v, operand) <= 0);
    case '$regex': {
      const re = operand instanceof RegExp ? operand : new RegExp(operand, undefined);
      return values.some((v) => v !== null && v !== undefined && re.test(String(v)));
    }
    case '$options':
      return true; // handled alongside $regex
    case '$not':
      return !matchesCondition(docValue, operand, rawDocValue);
    case '$size':
      return Array.isArray(rawDocValue) && rawDocValue.length === operand;
    case '$all':
      return Array.isArray(rawDocValue) &&
        (operand || []).every((c) => rawDocValue.some((v) => valueEquals(v, c)));
    case '$elemMatch':
      return Array.isArray(rawDocValue) &&
        rawDocValue.some((el) =>
          typeof el === 'object' && !Array.isArray(el)
            ? matchesFilter(el, operand)
            : matchesCondition(el, operand, el)
        );
    case '$type':
      return values.some((v) => typeof v === (operand === 'string' ? 'string' : operand));
    default:
      return false;
  }
};

const matchesCondition = (docValue, cond, rawDocValue) => {
  const raw = rawDocValue === undefined ? docValue : rawDocValue;
  if (cond instanceof RegExp) {
    return flatten([docValue]).some((v) => v !== null && v !== undefined && cond.test(String(v)));
  }
  if (isPlainObject(cond) && Object.keys(cond).some((k) => k.startsWith('$'))) {
    // Handle $regex + $options pair.
    if (cond.$regex !== undefined) {
      const opts = cond.$options;
      const re = cond.$regex instanceof RegExp ? cond.$regex : new RegExp(cond.$regex, opts);
      return flatten([docValue]).some((v) => v !== null && v !== undefined && re.test(String(v)));
    }
    return Object.entries(cond).every(([op, operand]) =>
      matchOperator(docValue, op, operand, raw)
    );
  }
  if (Array.isArray(raw) && !Array.isArray(cond)) {
    return raw.some((el) => valueEquals(el, cond));
  }
  if (Array.isArray(cond)) {
    return Array.isArray(raw)
      ? JSON.stringify(raw.map(normalizeValue)) === JSON.stringify(cond.map(normalizeValue))
      : false;
  }
  return valueEquals(raw, cond);
};

const validateIdFilter = (cond) => {
  const check = (value) => {
    if (typeof value === 'string' && !HEX24.test(value)) throw castError(value);
  };
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if (cond.$in) cond.$in.forEach(check);
    if (cond.$nin) cond.$nin.forEach(check);
    if (cond.$ne !== undefined) check(cond.$ne);
    if (cond.$eq !== undefined) check(cond.$eq);
  } else if (Array.isArray(cond)) {
    cond.forEach(check);
  } else {
    check(cond);
  }
};

const matchesFilter = (doc, filter) => {
  if (!filter) return true;
  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$or') {
      if (!Array.isArray(cond) || !cond.some((f) => matchesFilter(doc, f))) return false;
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(cond) || !cond.every((f) => matchesFilter(doc, f))) return false;
      continue;
    }
    if (key === '$nor') {
      if (Array.isArray(cond) && cond.some((f) => matchesFilter(doc, f))) return false;
      continue;
    }
    if (key === '$where') continue; // never execute arbitrary code
    if (key === '_id') validateIdFilter(cond);
    const values = getValues(doc, key);
    if (values.length === 0) {
      // Missing field: only $exists:false / $ne / $nin can match.
      if (isPlainObject(cond) && Object.keys(cond).some((k) => k.startsWith('$'))) {
        if (!Object.entries(cond).every(([op, operand]) =>
          matchOperator(undefined, op, operand, undefined)
        )) return false;
      } else {
        return false;
      }
      continue;
    }
    const ok = values.some((v) => matchesCondition(v, cond, v));
    if (!ok) return false;
  }
  return true;
};

const compareValues = (a, b) => {
  const av = normalizeValue(a);
  const bv = normalizeValue(b);
  if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : -1;
  if (bv === null || bv === undefined) return 1;
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  const aNum = typeof av === 'string' && av !== '' && !Number.isNaN(Number(av)) ? Number(av) : null;
  const bNum = typeof bv === 'string' && bv !== '' && !Number.isNaN(Number(bv)) ? Number(bv) : null;
  if (aNum !== null && bNum !== null) return aNum - bNum;
  const as = String(av);
  const bs = String(bv);
  if (as < bs) return -1;
  if (as > bs) return 1;
  return 0;
};

const applyUpdate = (data, update) => {
  if (!update || typeof update !== 'object') return data;
  const operators = Object.keys(update).filter((k) => k.startsWith('$'));
  if (operators.length === 0) {
    // Mongoose treats a plain object as $set (implicit).
    for (const [key, value] of Object.entries(update)) {
      setPath(data, key, clone(value));
    }
    return data;
  }
  for (const op of operators) {
    const fields = update[op] || {};
    if (op === '$set') {
      for (const [key, value] of Object.entries(fields)) setPath(data, key, clone(value));
    } else if (op === '$unset') {
      for (const key of Object.keys(fields)) unsetPath(data, key);
    } else if (op === '$inc') {
      for (const [key, value] of Object.entries(fields)) {
        const current = getValues(data, key)[0];
        setPath(data, key, (typeof current === 'number' ? current : 0) + value);
      }
    } else if (op === '$push' || op === '$addToSet') {
      for (const [key, value] of Object.entries(fields)) {
        const current = getValues(data, key)[0];
        const arr = Array.isArray(current) ? current.slice() : [];
        const items = value && typeof value === 'object' && value.$each
          ? value.$each
          : [value];
        for (const item of items) {
          if (op === '$addToSet' && arr.some((v) => valueEquals(v, item))) continue;
          arr.push(clone(item));
        }
        setPath(data, key, arr);
      }
    } else if (op === '$pull') {
      for (const [key, value] of Object.entries(fields)) {
        const current = getValues(data, key)[0];
        if (!Array.isArray(current)) continue;
        setPath(
          data,
          key,
          current.filter((el) => !matchesCondition(el, value, el))
        );
      }
    } else if (op === '$setOnInsert') {
      // Only applied by upsert paths; handled by caller.
    } else if (op === '$min' || op === '$max') {
      for (const [key, value] of Object.entries(fields)) {
        const current = getValues(data, key)[0];
        if (current === undefined) setPath(data, key, clone(value));
        else if (op === '$min' && compareValues(value, current) < 0) setPath(data, key, clone(value));
        else if (op === '$max' && compareValues(value, current) > 0) setPath(data, key, clone(value));
      }
    }
  }
  return data;
};

// ─── Model definition ──────────────────────────────────────────────────────

const registry = new Map();

const defineModel = (name, options = {}) => {
  const {
    defaults = {},
    indexes = [],
    refs = {},
    hidden = [],
    virtuals = {},
    methods = {},
    statics = {},
    preSave = null,
    timestamps = true,
    immutable = false,
  } = options;

  const collection = options.collection || name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();

  const normalizeRefPath = (container, path) => {
    const parts = path.split('.');
    const walk = (node, idx) => {
      if (!node || typeof node !== 'object') return;
      if (idx === parts.length - 1) {
        const key = parts[idx];
        if (Array.isArray(node)) {
          for (const el of node) {
            if (el && typeof el === 'object') el[key] = asId(el[key]);
          }
        } else {
          node[key] = asId(node[key]);
        }
        return;
      }
      const key = parts[idx];
      if (Array.isArray(node)) {
        for (const el of node) {
          if (el && typeof el === 'object') walk(el[key], idx + 1);
        }
      } else {
        walk(node[key], idx + 1);
      }
    };
    walk(container, 0);
  };

  const normalizeRefs = (data) => {
    for (const refPath of Object.keys(refs)) {
      normalizeRefPath(data, refPath);
    }
    return data;
  };

  const applyDefaults = (data) => {
    const out = { ...data };
    for (const [key, value] of Object.entries(defaults)) {
      if (out[key] === undefined) out[key] = typeof value === 'function' ? value() : clone(value);
    }
    if (out._id === undefined || out._id === null || out._id === '') {
      out._id = generateId();
    } else {
      out._id = asId(out._id);
      if (typeof out._id === 'string' && !HEX24.test(out._id)) {
        // Keep externally-supplied non-ObjectId ids as-is (legacy imports).
        out._id = String(out._id);
      }
    }
    normalizeRefs(out);
    return out;
  };

  const loadAll = async () => {
    const p = await ensureReady();
    const res = await p.query('SELECT data FROM documents WHERE collection = $1', [collection]);
    return res.rows.map((r) => r.data);
  };

  const loadById = async (id) => {
    const p = await ensureReady();
    const res = await p.query(
      'SELECT data FROM documents WHERE collection = $1 AND id = $2',
      [collection, String(id)]
    );
    return res.rows.length ? res.rows[0].data : null;
  };

  const insertRow = async (data) => {
    const p = await ensureReady();
    await p.query(
      'INSERT INTO documents (id, collection, data) VALUES ($1, $2, $3)',
      [data._id, collection, JSON.stringify(toPlain(data))]
    );
  };

  const replaceRow = async (id, data) => {
    const p = await ensureReady();
    await p.query(
      'UPDATE documents SET data = $3, updated_at = now() WHERE collection = $1 AND id = $2',
      [collection, String(id), JSON.stringify(toPlain(data))]
    );
  };

  const deleteRows = async (ids) => {
    if (!ids.length) return 0;
    const p = await ensureReady();
    const res = await p.query(
      'DELETE FROM documents WHERE collection = $1 AND id = ANY($2::text[])',
      [collection, ids.map(String)]
    );
    return res.rowCount;
  };

  const assertUnique = async (data, excludeId) => {
    const uniqueIndexes = indexes.filter((idx) => idx.unique);
    if (!uniqueIndexes.length) return;
    const all = await loadAll();
    for (const idx of uniqueIndexes) {
      const fields = Object.keys(idx.fields || {});
      if (!fields.length) continue;
      if (fields.some((f) => data[f] === undefined || data[f] === null)) continue;
      for (const other of all) {
        if (excludeId && other._id === excludeId) continue;
        const same = fields.every((f) => valueEquals(other[f], data[f]));
        if (same) {
          const keyValue = {};
          for (const f of fields) keyValue[f] = data[f];
          throw duplicateError(fields, keyValue);
        }
      }
    }
  };

  const makeDoc = (rawData, isNew = false) => {
    const data = applyDefaults(rawData);
    return createDocument(Model, data, isNew);
  };

  const createRaw = async (input) => {
    let data = applyDefaults(clone(input || {}));
    if (timestamps) {
      const now = new Date().toISOString();
      if (data.createdAt === undefined) data.createdAt = now;
      data.updatedAt = now;
    }
    const doc = createDocument(Model, data, true);
    await doc.save();
    return doc;
  };

  // Populate implementation --------------------------------------------------

  const collectTargets = (container, segments) => {
    // returns array of { parent, key } pairs whose value is an id or array of ids
    const [head, ...rest] = segments;
    const targets = [];
    const visit = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      const value = obj[head];
      if (value === undefined || value === null) return;
      if (rest.length === 0) {
        targets.push({ parent: obj, key: head });
      } else if (Array.isArray(value)) {
        value.forEach(visit);
      } else {
        visit(value);
      }
    };
    visit(container);
    return targets;
  };

  const idListFrom = (value) => {
    if (Array.isArray(value)) return value.map(asId).filter((v) => typeof v === 'string');
    const id = asId(value);
    return typeof id === 'string' ? [id] : [];
  };

  const populateOne = async (docs, populateSpec) => {
    const segments = populateSpec.path.split('.');
    const rootName = refs[segments[0]] || refs[populateSpec.path];
    if (!rootName) return;
    const refModel = registry.get(rootName);
    if (!refModel) return;

    const targets = [];
    for (const doc of docs) targets.push(...collectTargets(doc, segments));
    if (!targets.length) return;

    const ids = new Set();
    for (const t of targets) {
      for (const id of idListFrom(t.parent[t.key])) ids.add(id);
    }
    if (!ids.size) return;

    const refDocs = await refModel._findRawByIds([...ids]);
    const byId = new Map(refDocs.map((d) => [d._id, d]));

    for (const t of targets) {
      const value = t.parent[t.key];
      if (Array.isArray(value)) {
        t.parent[t.key] = value
          .map((v) => {
            const id = asId(v);
            const found = byId.get(id);
            if (!found) return v;
            return project(found, populateSpec.select, refModel.hidden);
          })
          .filter((v) => v !== null);
      } else {
        const id = asId(value);
        const found = byId.get(id);
        if (found) t.parent[t.key] = project(found, populateSpec.select, refModel.hidden);
      }
    }
  };

  const runPopulates = async (docs, populates) => {
    for (const spec of populates) {
      await populateOne(docs, spec);
    }
  };

  // Projection --------------------------------------------------------------

  const parseSelect = (spec) => {
    if (!spec) return null;
    let tokens = [];
    if (typeof spec === 'string') tokens = spec.trim().split(/\s+/).filter(Boolean);
    else if (Array.isArray(spec)) tokens = spec;
    else if (typeof spec === 'object') {
      tokens = Object.entries(spec).filter(([, v]) => v).map(([k]) => k);
    }
    const include = [];
    const exclude = [];
    let additive = false;
    for (const raw of tokens) {
      if (raw.startsWith('+')) {
        include.push(raw.slice(1));
        additive = true;
      } else if (raw.startsWith('-')) {
        exclude.push(raw.slice(1));
      } else {
        include.push(raw);
      }
    }
    if (include.length && exclude.length) {
      // Mixed: keep includes, ignore excludes (Mongo rejects this; be lenient)
      return { mode: 'include', fields: include, additive };
    }
    if (exclude.length) return { mode: 'exclude', fields: exclude, additive };
    if (additive && include.length === 0) return { mode: 'all', fields: [], additive };
    if (include.length) {
      // '+field' alone means "all fields plus hidden field"
      if (additive && include.length >= 1) {
        const real = include.filter((f) => !hidden.includes(f));
        if (real.length === 0) return { mode: 'all', fields: include, additive: true };
      }
      return { mode: 'include', fields: include, additive };
    }
    return null;
  };

  const project = (rawData, spec, hiddenFields = []) => {
    const parsed = parseSelect(spec);
    const source = clone(rawData);
    if (!parsed) {
      for (const h of hiddenFields) delete source[h];
      return source;
    }
    if (parsed.mode === 'include') {
      const out = {};
      if (source._id !== undefined && !parsed.fields.includes('_id')) out._id = source._id;
      for (const field of parsed.fields) {
        if (field in source) out[field] = source[field];
      }
      if (source._id !== undefined) out._id = source._id;
      for (const h of hiddenFields) {
        if (!parsed.fields.includes(h)) delete out[h];
      }
      return out;
    }
    if (parsed.mode === 'exclude') {
      for (const field of parsed.fields) delete source[field];
      for (const h of hiddenFields) delete source[h];
      return source;
    }
    if (parsed.mode === 'all') {
      // All fields; hidden ones only when explicitly requested with '+field'.
      for (const h of hiddenFields) {
        if (!(parsed.additive && parsed.fields.includes(h))) delete source[h];
      }
      return source;
    }
    return source;
  };

  // Query class --------------------------------------------------------------

  class Query {
    constructor(filter, single) {
      this._filter = filter || {};
      this._single = !!single;
      this._select = null;
      this._populates = [];
      this._sort = null;
      this._skip = 0;
      this._limit = null;
      this._lean = false;
    }

    select(spec) {
      this._select = spec;
      return this;
    }

    populate(path, select) {
      if (path && typeof path === 'object') {
        this._populates.push({ path: path.path, select: path.select });
      } else {
        this._populates.push({ path, select });
      }
      return this;
    }

    sort(spec) {
      this._sort = spec;
      return this;
    }

    skip(n) {
      this._skip = Number(n) || 0;
      return this;
    }

    limit(n) {
      this._limit = n === undefined || n === null ? null : Number(n);
      return this;
    }

    lean(value = true) {
      this._lean = value !== false;
      return this;
    }

    exec() {
      return this._run();
    }

    then(onFulfilled, onRejected) {
      return this._run().then(onFulfilled, onRejected);
    }

    catch(onRejected) {
      return this._run().catch(onRejected);
    }

    finally(onFinally) {
      return this._run().finally(onFinally);
    }

    async _run() {
      let docs = await loadAll();
      docs = docs.filter((d) => matchesFilter(d, this._filter));

      if (this._sort) docs = sortDocs(docs, this._sort);

      if (this._single) {
        docs = docs.slice(0, 1);
      } else {
        if (this._skip) docs = docs.slice(this._skip);
        if (this._limit !== null) docs = docs.slice(0, this._limit);
      }

      if (this._populates.length) {
        await runPopulates(docs, this._populates);
        // Re-sort after populate so sorting by populated paths works.
        if (this._sort && this._populates.length) docs = sortDocs(docs, this._sort);
      }

      const projected = docs.map((d) => project(d, this._select, hidden));

      if (this._single) {
        if (!projected.length) return null;
        return this._lean ? projected[0] : makeDoc(projected[0], false);
      }
      return this._lean ? projected : projected.map((d) => makeDoc(d, false));
    }
  }

  const sortDocs = (docs, spec) => {
    let entries = [];
    if (typeof spec === 'string') {
      entries = spec.trim().split(/\s+/).filter(Boolean).map((field) => {
        if (field.startsWith('-')) return [field.slice(1), -1];
        return [field, 1];
      });
    } else if (Array.isArray(spec)) {
      entries = spec.map((field) => (String(field).startsWith('-') ? [String(field).slice(1), -1] : [field, 1]));
    } else if (spec && typeof spec === 'object') {
      entries = Object.entries(spec);
    }
    return docs.slice().sort((a, b) => {
      for (const [field, dirRaw] of entries) {
        const dir = Number(dirRaw) < 0 ? -1 : 1;
        const av = flatten(getValues(a, field))[0];
        const bv = flatten(getValues(b, field))[0];
        const cmp = compareValues(av, bv);
        if (cmp !== 0) return cmp * dir;
      }
      return 0;
    });
  };

  // Model -------------------------------------------------------------------

  function Model(data) {
    return createDocument(Model, applyDefaults(clone(data || {})), true);
  }

  Model.modelName = name;
  Model.collectionName = collection;
  Model.hidden = hidden;
  Model.defaults = defaults;
  Model.indexes = indexes;

  // Persistence primitives used by document.save()
  Model.__preSave = preSave;
  Model.__assertUnique = assertUnique;
  Model.__insert = insertRow;
  Model.__loadById = loadById;
  Model.__replace = replaceRow;
  Model.__timestamps = timestamps;
  Model.__methods = methods;
  Model.__virtuals = virtuals;
  Model.__refs = refs;
  Model.__normalizeRefs = normalizeRefs;
  Model.__immutable = immutable;

  Model._findRawByIds = async (ids) => {
    if (!ids.length) return [];
    const p = await ensureReady();
    const res = await p.query(
      'SELECT data FROM documents WHERE collection = $1 AND id = ANY($2::text[])',
      [collection, ids.map(String)]
    );
    return res.rows.map((r) => r.data);
  };

  Model.find = (filter = {}) => new Query(filter, false);
  Model.findOne = (filter = {}) => new Query(filter, true);
  Model.findById = (id) => {
    if (id === undefined || id === null) throw castError(id);
    if (typeof id === 'string' && !HEX24.test(id)) throw castError(id);
    return new Query({ _id: asId(id) }, true);
  };
  Model.findByIdAndUpdate = (id, update, options = {}) =>
    Model.findOneAndUpdate({ _id: asId(id) }, update, options);
  Model.findByIdAndDelete = (id) => Model.findOneAndDelete({ _id: asId(id) });
  Model.findOneAndDelete = async (filter) => {
    const doc = await Model.findOne(filter);
    if (!doc) return null;
    await deleteRows([doc._id]);
    return doc;
  };

  Model.create = async (input) => {
    if (Array.isArray(input)) {
      const out = [];
      for (const item of input) out.push(await createRaw(item));
      return out;
    }
    return createRaw(input);
  };

  Model.insertMany = async (items) => {
    const out = [];
    for (const item of items) out.push(await createRaw(item));
    return out;
  };

  Model.findOneAndUpdate = async (filter = {}, update = {}, options = {}) => {
    if (Model.__immutable) {
      const err = new Error('Immutable document: updates are not allowed');
      err.name = 'ImmutableError';
      throw err;
    }
    const all = await loadAll();
    const raw = all.find((d) => matchesFilter(d, filter));
    if (raw) {
      const updated = normalizeRefs(applyUpdate(clone(raw), update));
      if (timestamps) updated.updatedAt = new Date().toISOString();
      await assertUnique(updated, updated._id);
      await replaceRow(updated._id, updated);
      const out = options.new ? updated : raw;
      return options.lean ? project(out, null, hidden) : makeDoc(out, false);
    }
    if (!options.upsert) return null;
    let base = {};
    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith('$')) continue;
      if (isPlainObject(value) && Object.keys(value).some((k) => k.startsWith('$'))) continue;
      setPath(base, key, clone(value));
    }
    base = normalizeRefs(applyUpdate(base, update));
    if (update.$setOnInsert) {
      for (const [k, v] of Object.entries(update.$setOnInsert)) setPath(base, k, clone(v));
    }
    const doc = await createRaw(base);
    return options.lean ? project(doc.__data, null, hidden) : doc;
  };

  Model.updateOne = async (filter, update) => {
    if (Model.__immutable) {
      const err = new Error('Immutable document: updates are not allowed');
      err.name = 'ImmutableError';
      throw err;
    }
    const before = await Model.findOne(filter);
    if (!before) return { acknowledged: true, matchedCount: 0, modifiedCount: 0, n: 0, nModified: 0 };
    const raw = before.__data;
    const updated = normalizeRefs(applyUpdate(clone(raw), update));
    if (timestamps) updated.updatedAt = new Date().toISOString();
    await assertUnique(updated, updated._id);
    await replaceRow(updated._id, updated);
    const changed = JSON.stringify(toPlain(raw)) !== JSON.stringify(toPlain(updated)) ? 1 : 0;
    return { acknowledged: true, matchedCount: 1, modifiedCount: changed, n: 1, nModified: changed };
  };

  Model.updateMany = async (filter, update) => {
    const all = await loadAll();
    const matched = all.filter((d) => matchesFilter(d, filter));
    let modified = 0;
    for (const raw of matched) {
      const updated = normalizeRefs(applyUpdate(clone(raw), update));
      if (timestamps) updated.updatedAt = new Date().toISOString();
      await assertUnique(updated, updated._id);
      await replaceRow(updated._id, updated);
      if (JSON.stringify(toPlain(raw)) !== JSON.stringify(toPlain(updated))) modified += 1;
    }
    return {
      acknowledged: true,
      matchedCount: matched.length,
      modifiedCount: modified,
      n: matched.length,
      nModified: modified,
    };
  };

  Model.deleteOne = async (filter) => {
    if (Model.__immutable) {
      const err = new Error('Immutable document: deletion is not allowed');
      err.name = 'ImmutableError';
      throw err;
    }
    const doc = await Model.findOne(filter);
    if (!doc) return { acknowledged: true, deletedCount: 0 };
    const n = await deleteRows([doc._id]);
    return { acknowledged: true, deletedCount: n };
  };

  Model.deleteMany = async (filter = {}) => {
    if (Model.__immutable) {
      const err = new Error('Immutable document: deletion is not allowed');
      err.name = 'ImmutableError';
      throw err;
    }
    const all = await loadAll();
    const ids = all.filter((d) => matchesFilter(d, filter)).map((d) => d._id);
    const n = await deleteRows(ids);
    return { acknowledged: true, deletedCount: n };
  };

  Model.countDocuments = async (filter = {}) => {
    const all = await loadAll();
    return all.filter((d) => matchesFilter(d, filter)).length;
  };

  Model.distinct = async (field, filter = {}) => {
    const all = await loadAll();
    const values = [];
    for (const doc of all) {
      if (!matchesFilter(doc, filter)) continue;
      for (const v of flatten(getValues(doc, field))) {
        if (!values.some((x) => valueEquals(x, v))) values.push(v);
      }
    }
    return values;
  };

  Model.aggregate = async (pipeline = []) => {
    let docs = await loadAll();
    for (const stage of pipeline) {
      if (stage.$match) {
        docs = docs.filter((d) => matchesFilter(d, stage.$match));
      } else if (stage.$sort) {
        docs = sortDocs(docs, stage.$sort);
      } else if (stage.$skip !== undefined) {
        docs = docs.slice(stage.$skip);
      } else if (stage.$limit !== undefined) {
        docs = docs.slice(0, stage.$limit);
      } else if (stage.$count) {
        docs = [{ [stage.$count]: docs.length }];
      } else if (stage.$group) {
        docs = groupDocs(docs, stage.$group);
      } else if (stage.$project) {
        const spec = {};
        for (const [k, v] of Object.entries(stage.$project)) {
          if (v === 1 || v === true) spec[k] = 1;
          if (v === 0 || v === false) delete spec[k];
        }
        docs = docs.map((d) => project(d, Object.keys(spec), []));
      } else if (stage.$unwind) {
        const path = typeof stage.$unwind === 'string' ? stage.$unwind : stage.$unwind.path;
        const out = [];
        for (const d of docs) {
          const arr = getValues(d, path)[0];
          if (Array.isArray(arr)) {
            for (const item of arr) {
              const copy = clone(d);
              setPath(copy, path, item);
              out.push(copy);
            }
          }
        }
        docs = out;
      }
    }
    return docs.map((d) => clone(d));
  };

  const groupDocs = (docs, groupSpec) => {
    const { _id: idSpec, ...accumulators } = groupSpec;
    const keyFor = (doc) => {
      if (idSpec === null || idSpec === undefined) return '__all__';
      if (typeof idSpec === 'string' && idSpec.startsWith('$')) {
        return String(flatten(getValues(doc, idSpec.slice(1)))[0]);
      }
      if (isPlainObject(idSpec)) {
        const obj = {};
        for (const [k, v] of Object.entries(idSpec)) {
          if (typeof v === 'string' && v.startsWith('$')) {
            obj[k] = flatten(getValues(doc, v.slice(1)))[0];
          } else {
            obj[k] = v;
          }
        }
        return JSON.stringify(obj);
      }
      return String(idSpec);
    };
    const groups = new Map();
    for (const doc of docs) {
      const key = keyFor(doc);
      if (!groups.has(key)) {
        let idVal;
        if (idSpec === null || idSpec === undefined) idVal = null;
        else if (typeof idSpec === 'string' && idSpec.startsWith('$')) {
          idVal = flatten(getValues(doc, idSpec.slice(1)))[0];
        } else if (isPlainObject(idSpec)) {
          idVal = {};
          for (const [k, v] of Object.entries(idSpec)) {
            if (typeof v === 'string' && v.startsWith('$')) {
              idVal[k] = flatten(getValues(doc, v.slice(1)))[0];
            } else {
              idVal[k] = v;
            }
          }
        } else {
          idVal = idSpec;
        }
        groups.set(key, { _id: idVal, __docs: [] });
      }
      groups.get(key).__docs.push(doc);
    }
    const out = [];
    for (const group of groups.values()) {
      const row = { _id: group._id };
      for (const [field, expr] of Object.entries(accumulators)) {
        const [op, operand] = Object.entries(expr)[0] || [];
        const pick = (doc) => (typeof operand === 'string' && operand.startsWith('$')
          ? flatten(getValues(doc, operand.slice(1)))[0]
          : operand);
        const vals = group.__docs.map(pick).filter((v) => typeof v === 'number');
        if (op === '$sum') row[field] = vals.reduce((s, v) => s + v, 0);
        else if (op === '$avg') row[field] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
        else if (op === '$min') row[field] = vals.length ? Math.min(...vals) : null;
        else if (op === '$max') row[field] = vals.length ? Math.max(...vals) : null;
        else if (op === '$count') row[field] = group.__docs.length;
        else if (op === '$first') row[field] = pick(group.__docs[0]);
        else if (op === '$last') row[field] = pick(group.__docs[group.__docs.length - 1]);
        else if (op === '$push') row[field] = group.__docs.map(pick);
      }
      out.push(row);
    }
    return out;
  };

  Model.exists = async (filter = {}) => {
    const doc = await Model.findOne(filter);
    return doc ? { _id: doc._id } : null;
  };

  Model.hydrate = (data) => makeDoc(data, false);

  Object.assign(Model, statics);

  registry.set(name, Model);
  return Model;
};

// ─── Document instance ─────────────────────────────────────────────────────

const createDocument = (Model, data, isNew) => {
  const state = {
    data,
    isNew,
    modified: new Set(),
  };
  // New documents are considered \"modified\" for every assigned field so
  // pre-save hooks (e.g. password hashing) run exactly like Mongoose.
  if (isNew) {
    for (const key of Object.keys(data)) state.modified.add(key);
  }

  const target = {
    __isPgoDoc: true,
    __data: state.data,
    __model: Model,
    __isNew: state.isNew,
    __modified: state.modified,
  };

  const isInternal = (key) => key.startsWith('__');

  const callMethod = (fn) => fn;

  const save = async () => {
    const doc = proxy;
    if (Model.__immutable && !state.isNew) {
      const err = new Error('Immutable document: persisted records cannot be re-saved');
      err.name = 'ImmutableError';
      throw err;
    }
    if (typeof Model.__preSave === 'function') {
      await Model.__preSave(doc);
    }
    const now = new Date().toISOString();
    if (state.isNew) {
      if (state.data.createdAt === undefined) state.data.createdAt = now;
      state.data.updatedAt = now;
      Model.__normalizeRefs(state.data);
      await Model.__assertUnique(state.data, null);
      await Model.__insert(state.data);
      state.isNew = false;
      target.__isNew = false;
      state.modified.clear();
      return doc;
    }
    if (state.modified.size === 0) return doc;
    // Merge only modified fields into the stored document so projections
    // (e.g. select('-passwordHash')) never wipe unselected fields.
    const stored = (await Model.__loadById(state.data._id)) || {};
    const merged = { ...stored };
    for (const key of state.modified) {
      if (state.data[key] === undefined) delete merged[key];
      else merged[key] = clone(state.data[key]);
    }
    if (Model.__timestamps) merged.updatedAt = now;
    Model.__normalizeRefs(merged);
    await Model.__assertUnique(merged, merged._id);
    await Model.__replace(merged._id, merged);
    target.__data = state.data = merged;
    state.modified.clear();
    return doc;
  };

  const set = (obj) => {
    if (!obj || typeof obj !== 'object') return proxy;
    for (const [key, value] of Object.entries(obj)) {
      state.data[key] = value;
      state.modified.add(key);
    }
    return proxy;
  };

  const toObject = () => {
    const out = {};
    for (const [key, value] of Object.entries(state.data)) {
      out[key] = toPlain(value);
    }
    for (const [name, getter] of Object.entries(Model.__virtuals || {})) {
      out[name] = getter.call(proxy, state.data);
    }
    return out;
  };

  const toJSON = () => {
    const out = {};
    for (const [key, value] of Object.entries(state.data)) {
      out[key] = toPlain(value);
    }
    return out;
  };

  const handler = {
    get(t, prop, receiver) {
      if (prop === '__isPgoDoc') return true;
      if (prop === '__data') return state.data;
      if (prop === '__model') return Model;
      if (prop === '__isNew') return state.isNew;
      if (prop === '__modified') return state.modified;
      if (typeof prop === 'symbol') return Reflect.get(t, prop, receiver);
      if (prop === 'then') return undefined; // never thenable
      if (prop === 'save') return save;
      if (prop === 'set') return set;
      if (prop === 'toObject') return toObject;
      if (prop === 'toJSON') return toJSON;
      if (prop === 'isNew') return state.isNew;
      if (prop === 'isModified') {
        return (key) => (key ? state.modified.has(key) : state.modified.size > 0);
      }
      if (prop === 'markModified') {
        return (key) => { state.modified.add(key); };
      }
      if (prop === 'toString') {
        return () => (state.data && state.data._id ? String(state.data._id) : '[object Object]');
      }
      if (prop === 'equals') {
        return (other) => String(other) === String(state.data._id);
      }
      if (prop === '_doc') return state.data;
      if (Model.__methods && Object.prototype.hasOwnProperty.call(Model.__methods, prop)) {
        return (...args) => Model.__methods[prop].apply(receiver, args);
      }
      if (Model.__virtuals && Object.prototype.hasOwnProperty.call(Model.__virtuals, prop)) {
        return Model.__virtuals[prop].call(receiver, state.data);
      }
      if (prop in state.data) return state.data[prop];
      return undefined;
    },
    set(t, prop, value) {
      if (typeof prop === 'string' && !isInternal(prop)) {
        state.data[prop] = value;
        state.modified.add(prop);
      }
      return true;
    },
    has(t, prop) {
      return prop in state.data || prop === 'save' || prop === 'set';
    },
    ownKeys() {
      return Reflect.ownKeys(state.data);
    },
    getOwnPropertyDescriptor(t, prop) {
      if (prop in state.data) {
        return { configurable: true, enumerable: true, value: state.data[prop], writable: true };
      }
      return undefined;
    },
  };

  const proxy = new Proxy(target, handler);
  target.__proxy = proxy;
  return proxy;
};

// Expose the persistence primitives the document save() path needs.
const attachModelInternals = (Model) => {
  // Filled in by defineModel after creation (kept separate for readability).
  return Model;
};

// ─── Public surface ────────────────────────────────────────────────────────

const connection = {
  get readyState() {
    return readyState;
  },
  dropDatabase: async () => {
    const p = await ensureReady();
    await p.query('DELETE FROM documents');
  },
  close: disconnect,
};

module.exports = {
  defineModel,
  connect,
  disconnect,
  connection,
  Types: { ObjectId },
  ObjectId,
  isValidObjectId: (v) => HEX24.test(String(v)),
  get readyState() {
    return readyState;
  },
  models: registry,
  get connectionReadyState() {
    return readyState;
  },
};
