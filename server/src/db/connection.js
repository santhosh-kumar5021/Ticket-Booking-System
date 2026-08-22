import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API_URL = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query`;

/**
 * Format parameterized SQL query string securely for Supabase Postgres
 */
export function formatQuery(sql, params = []) {
  if (!params || params.length === 0) return sql;

  let paramIndex = 0;
  const normalizedSql = sql.replace(/\$\d+/g, '?');

  const formatted = normalizedSql.replace(/\?/g, () => {
    if (paramIndex >= params.length) return 'NULL';
    return formatValue(params[paramIndex++]);
  });

  return formatted;
}

function formatValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/'/g, "''")}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Core query function against Supabase API
 */
export async function query(sql, params = []) {
  const formattedSql = formatQuery(sql, params);
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: formattedSql })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errMessage = data?.message || data?.error || response.statusText || 'Database query error';
    const err = new Error(errMessage);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  const rows = Array.isArray(data) ? data : (data?.value || []);
  return {
    rows,
    rowCount: rows.length
  };
}

export async function get(sql, params = []) {
  const res = await query(sql, params);
  return res.rows[0] || null;
}

export async function all(sql, params = []) {
  const res = await query(sql, params);
  return res.rows;
}

export async function run(sql, params = []) {
  const res = await query(sql, params);
  return { rowCount: res.rowCount };
}

export async function transaction(queriesFn) {
  return await queriesFn({ query, get, all, run });
}

export const db = {
  query,
  get,
  all,
  run,
  transaction
};

export default db;
