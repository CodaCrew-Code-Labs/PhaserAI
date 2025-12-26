import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { executeQuery, lambdaResponse, extractPathParams, extractQueryParams, extractBody } from './db-utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const httpMethod = event.httpMethod;
    const pathParams = extractPathParams(event);
    const queryParams = extractQueryParams(event);
    const resourcePath = event.resource || '';

    switch (httpMethod) {
      case 'GET':
        if (resourcePath.includes('/users/{userId}/languages')) {
          return await getUserLanguages(pathParams.userId);
        } else if (pathParams.languageId) {
          return await getLanguage(pathParams.languageId, queryParams.userId);
        } else {
          return await getLanguages(queryParams);
        }
      case 'POST':
        return await createLanguage(extractBody(event));
      case 'PUT':
        return await updateLanguage(pathParams.languageId, extractBody(event));
      case 'DELETE':
        return await deleteLanguage(pathParams.languageId, queryParams.userId);
      default:
        return lambdaResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in languages handler:', error);
    return lambdaResponse(500, { error: (error as Error).message });
  }
};

async function getLanguages(queryParams: Record<string, string>): Promise<APIGatewayProxyResult> {
  const userId = queryParams.userId;

  let query: string;
  let params: any[] = [];

  if (userId) {
    query = 'SELECT * FROM app_8b514_languages WHERE user_id = $1 ORDER BY created_at DESC';
    params = [userId];
  } else {
    query = 'SELECT * FROM app_8b514_languages ORDER BY created_at DESC';
  }

  const result = await executeQuery(query, params);
  return lambdaResponse(200, result);
}

async function getUserLanguages(userId: string): Promise<APIGatewayProxyResult> {
  if (!userId) {
    return lambdaResponse(400, { error: 'User ID is required' });
  }

  const query = 'SELECT * FROM app_8b514_languages WHERE user_id = $1 ORDER BY created_at DESC';
  const result = await executeQuery(query, [userId]);

  return lambdaResponse(200, result);
}

async function getLanguage(languageId: string, userId?: string): Promise<APIGatewayProxyResult> {
  if (!languageId) {
    return lambdaResponse(400, { error: 'Language ID is required' });
  }

  let query: string;
  let params: any[];

  if (userId) {
    query = 'SELECT * FROM app_8b514_languages WHERE id = $1 AND user_id = $2';
    params = [languageId, userId];
  } else {
    query = 'SELECT * FROM app_8b514_languages WHERE id = $1';
    params = [languageId];
  }

  const result = await executeQuery(query, params);

  if (!result.length) {
    return lambdaResponse(404, { error: 'Language not found' });
  }

  return lambdaResponse(200, result[0]);
}

async function createLanguage(languageData: any): Promise<APIGatewayProxyResult> {
  const requiredFields = ['user_id', 'name'];

  for (const field of requiredFields) {
    if (!languageData[field]) {
      return lambdaResponse(400, { error: `Missing required field: ${field}` });
    }
  }

  const phonemes = languageData.phonemes || {
    consonants: [],
    vowels: [],
    diphthongs: []
  };
  const alphabetMappings = languageData.alphabet_mappings || {
    consonants: {},
    vowels: {},
    diphthongs: {}
  };
  const syllables = languageData.syllables || 'CV';
  const syllableRules = languageData.syllable_rules || {};
  const exclusionRules = languageData.exclusion_rules || [];
  const rules = languageData.rules || '';
  const status = languageData.status || 'active';

  const query = `
    INSERT INTO app_8b514_languages (user_id, name, status, phonemes, alphabet_mappings, syllables, syllable_rules, exclusion_rules, rules)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const result = await executeQuery(query, [
    languageData.user_id,
    languageData.name,
    status,
    JSON.stringify(phonemes),
    JSON.stringify(alphabetMappings),
    syllables,
    JSON.stringify(syllableRules),
    JSON.stringify(exclusionRules),
    rules
  ]);

  return lambdaResponse(201, result[0]);
}

async function updateLanguage(languageId: string, languageData: any): Promise<APIGatewayProxyResult> {
  if (!languageId) {
    return lambdaResponse(400, { error: 'Language ID is required' });
  }

  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (languageData.name) {
    updateFields.push(`name = $${paramIndex++}`);
    params.push(languageData.name);
  }

  if (languageData.phonemes) {
    updateFields.push(`phonemes = $${paramIndex++}`);
    params.push(JSON.stringify(languageData.phonemes));
  }

  if (languageData.alphabet_mappings) {
    updateFields.push(`alphabet_mappings = $${paramIndex++}`);
    params.push(JSON.stringify(languageData.alphabet_mappings));
  }

  if (languageData.syllables) {
    updateFields.push(`syllables = $${paramIndex++}`);
    params.push(languageData.syllables);
  }

  if (languageData.syllable_rules !== undefined) {
    updateFields.push(`syllable_rules = $${paramIndex++}`);
    params.push(JSON.stringify(languageData.syllable_rules));
  }

  if (languageData.exclusion_rules !== undefined) {
    updateFields.push(`exclusion_rules = $${paramIndex++}`);
    params.push(JSON.stringify(languageData.exclusion_rules));
  }

  if (languageData.rules !== undefined) {
    updateFields.push(`rules = $${paramIndex++}`);
    params.push(languageData.rules);
  }

  if (languageData.status !== undefined) {
    updateFields.push(`status = $${paramIndex++}`);
    params.push(languageData.status);
  }

  if (!updateFields.length) {
    return lambdaResponse(400, { error: 'No fields to update' });
  }

  if (languageData.user_id) {
    const verifyQuery = 'SELECT user_id FROM app_8b514_languages WHERE id = $1';
    const verifyResult = await executeQuery(verifyQuery, [languageId]);

    if (!verifyResult.length) {
      return lambdaResponse(404, { error: 'Language not found' });
    }

    if (verifyResult[0].user_id !== languageData.user_id) {
      return lambdaResponse(403, { error: 'Access denied' });
    }
  }

  params.push(languageId);
  const query = `
    UPDATE app_8b514_languages 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await executeQuery(query, params);

  if (!result.length) {
    return lambdaResponse(404, { error: 'Language not found' });
  }

  return lambdaResponse(200, result[0]);
}

async function deleteLanguage(languageId: string, userId?: string): Promise<APIGatewayProxyResult> {
  if (!languageId) {
    return lambdaResponse(400, { error: 'Language ID is required' });
  }

  let query: string;
  let params: any[];

  if (userId) {
    query = 'DELETE FROM app_8b514_languages WHERE id = $1 AND user_id = $2 RETURNING id';
    params = [languageId, userId];
  } else {
    query = 'DELETE FROM app_8b514_languages WHERE id = $1 RETURNING id';
    params = [languageId];
  }

  const result = await executeQuery(query, params);

  if (!result.length) {
    return lambdaResponse(404, { error: 'Language not found or access denied' });
  }

  return lambdaResponse(200, { message: 'Language deleted successfully', id: result[0].id });
}