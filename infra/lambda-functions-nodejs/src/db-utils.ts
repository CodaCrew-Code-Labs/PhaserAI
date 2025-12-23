import { Pool, PoolClient, QueryResult } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface DatabaseCredentials {
  host: string;
  port: number;
  dbname: string;
  username: string;
  password: string;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

let pool: Pool | null = null;

export async function getDbConnection(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const secretsClient = new SecretsManagerClient({});
  const command = new GetSecretValueCommand({
    SecretId: process.env.SECRET_ARN!,
  });

  const response = await secretsClient.send(command);
  const secret: DatabaseCredentials = JSON.parse(response.SecretString!);

  pool = new Pool({
    host: secret.host,
    port: secret.port,
    database: secret.dbname,
    user: secret.username,
    password: secret.password,
    ssl: { rejectUnauthorized: false },
    max: 1, // Lambda connection limit
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  return pool;
}

export async function executeQuery<T extends Record<string, any> = any>(
  query: string,
  params?: any[],
  fetch: boolean = true
): Promise<T[]> {
  const pool = await getDbConnection();
  const client: PoolClient = await pool.connect();

  try {
    const result: QueryResult<T> = await client.query(query, params);
    
    if (fetch) {
      return result.rows;
    } else {
      return [{ rowCount: result.rowCount } as unknown as T];
    }
  } finally {
    client.release();
  }
}

export function lambdaResponse(
  statusCode: number,
  body: any,
  headers?: Record<string, string>
): LambdaResponse {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  return {
    statusCode,
    headers: { ...defaultHeaders, ...headers },
    body: JSON.stringify(body),
  };
}

export function extractPathParams(event: any): Record<string, string> {
  return event.pathParameters || {};
}

export function extractQueryParams(event: any): Record<string, string> {
  return event.queryStringParameters || {};
}

export function extractBody(event: any): any {
  const body = event.body || '{}';
  return typeof body === 'string' ? JSON.parse(body) : body;
}