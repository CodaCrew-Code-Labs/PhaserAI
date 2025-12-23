import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { executeQuery, lambdaResponse, extractPathParams, extractBody } from './db-utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const httpMethod = event.httpMethod;
    const pathParams = extractPathParams(event);

    switch (httpMethod) {
      case 'GET':
        return await getUser(pathParams.userId);
      case 'POST':
        return await createOrUpdateUser(extractBody(event));
      case 'PUT':
        return await updateUser(pathParams.userId, extractBody(event));
      default:
        return lambdaResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in users handler:', error);
    return lambdaResponse(500, { error: (error as Error).message });
  }
};

async function getUser(userId: string): Promise<APIGatewayProxyResult> {
  if (!userId) {
    return lambdaResponse(400, { error: 'User ID is required' });
  }

  const query = 'SELECT * FROM app_8b514_users WHERE user_id = $1';
  const result = await executeQuery(query, [userId]);

  if (!result.length) {
    return lambdaResponse(404, { error: 'User not found' });
  }

  return lambdaResponse(200, result[0]);
}

async function createOrUpdateUser(userData: any): Promise<APIGatewayProxyResult> {
  const requiredFields = ['user_id', 'email', 'username'];

  for (const field of requiredFields) {
    if (!userData[field]) {
      return lambdaResponse(400, { error: `Missing required field: ${field}` });
    }
  }

  const query = `
    INSERT INTO app_8b514_users (user_id, email, username)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      email = EXCLUDED.email,
      username = EXCLUDED.username
    RETURNING *
  `;

  const result = await executeQuery(query, [
    userData.user_id,
    userData.email,
    userData.username,
  ]);

  return lambdaResponse(201, result[0]);
}

async function updateUser(userId: string, userData: any): Promise<APIGatewayProxyResult> {
  if (!userId) {
    return lambdaResponse(400, { error: 'User ID is required' });
  }

  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (userData.email) {
    updateFields.push(`email = $${paramIndex++}`);
    params.push(userData.email);
  }

  if (userData.username) {
    updateFields.push(`username = $${paramIndex++}`);
    params.push(userData.username);
  }

  if (!updateFields.length) {
    return lambdaResponse(400, { error: 'No fields to update' });
  }

  params.push(userId);
  const query = `
    UPDATE app_8b514_users 
    SET ${updateFields.join(', ')}
    WHERE user_id = $${paramIndex}
    RETURNING *
  `;

  const result = await executeQuery(query, params);

  if (!result.length) {
    return lambdaResponse(404, { error: 'User not found' });
  }

  return lambdaResponse(200, result[0]);
}