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
        if (resourcePath.includes('/languages/{languageId}/words')) {
          return await getLanguageWords(pathParams.languageId, queryParams.userId);
        } else if (pathParams.wordId) {
          return await getWord(pathParams.wordId, queryParams.userId);
        } else {
          return await getWords(queryParams);
        }
      case 'POST':
        return await createWord(extractBody(event));
      case 'PUT':
        return await updateWord(pathParams.wordId, extractBody(event));
      case 'DELETE':
        return await deleteWord(pathParams.wordId, queryParams.userId);
      default:
        return lambdaResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in words handler:', error);
    return lambdaResponse(500, { error: (error as Error).message });
  }
};

async function getWords(queryParams: Record<string, string>): Promise<APIGatewayProxyResult> {
  const languageId = queryParams.languageId;
  const userId = queryParams.userId;

  let query: string;
  let params: any[] = [];

  const baseQuery = `
    SELECT 
      w.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', t.id,
            'language_code', t.language_code,
            'meaning', t.meaning,
            'created_at', t.created_at
          ) ORDER BY t.created_at
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) as app_8b514_translations
    FROM app_8b514_words w
    LEFT JOIN app_8b514_translations t ON w.id = t.word_id
  `;

  if (languageId && userId) {
    const verifyQuery = 'SELECT id FROM app_8b514_languages WHERE id = $1 AND user_id = $2';
    const verifyResult = await executeQuery(verifyQuery, [languageId, userId]);

    if (!verifyResult.length) {
      return lambdaResponse(404, { error: 'Language not found or access denied' });
    }

    query = `${baseQuery} WHERE w.language_id = $1 GROUP BY w.id ORDER BY w.created_at DESC`;
    params = [languageId];
  } else if (languageId) {
    query = `${baseQuery} WHERE w.language_id = $1 GROUP BY w.id ORDER BY w.created_at DESC`;
    params = [languageId];
  } else {
    query = `${baseQuery} GROUP BY w.id ORDER BY w.created_at DESC`;
  }

  const result = await executeQuery(query, params);
  return lambdaResponse(200, result);
}

async function getLanguageWords(languageId: string, userId?: string): Promise<APIGatewayProxyResult> {
  if (!languageId) {
    return lambdaResponse(400, { error: 'Language ID is required' });
  }

  if (userId) {
    const verifyQuery = 'SELECT id FROM app_8b514_languages WHERE id = $1 AND user_id = $2';
    const verifyResult = await executeQuery(verifyQuery, [languageId, userId]);

    if (!verifyResult.length) {
      return lambdaResponse(404, { error: 'Language not found or access denied' });
    }
  }

  const query = `
    SELECT 
      w.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', t.id,
            'language_code', t.language_code,
            'meaning', t.meaning,
            'created_at', t.created_at
          ) ORDER BY t.created_at
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) as app_8b514_translations
    FROM app_8b514_words w
    LEFT JOIN app_8b514_translations t ON w.id = t.word_id
    WHERE w.language_id = $1
    GROUP BY w.id
    ORDER BY w.created_at DESC
  `;

  const result = await executeQuery(query, [languageId]);
  return lambdaResponse(200, result);
}

async function getWord(wordId: string, userId?: string): Promise<APIGatewayProxyResult> {
  if (!wordId) {
    return lambdaResponse(400, { error: 'Word ID is required' });
  }

  let query: string;
  let params: any[];

  if (userId) {
    query = `
      SELECT w.* FROM app_8b514_words w
      JOIN app_8b514_languages l ON w.language_id = l.id
      WHERE w.id = $1 AND l.user_id = $2
    `;
    params = [wordId, userId];
  } else {
    query = 'SELECT * FROM app_8b514_words WHERE id = $1';
    params = [wordId];
  }

  const result = await executeQuery(query, params);

  if (!result.length) {
    return lambdaResponse(404, { error: 'Word not found' });
  }

  const word = result[0];

  const translationsQuery = 'SELECT * FROM app_8b514_translations WHERE word_id = $1 ORDER BY created_at';
  const translations = await executeQuery(translationsQuery, [wordId]);
  word.translations = translations || [];

  return lambdaResponse(200, word);
}

async function createWord(wordData: any): Promise<APIGatewayProxyResult> {
  const requiredFields = ['language_id', 'word', 'ipa'];

  for (const field of requiredFields) {
    if (!wordData[field]) {
      return lambdaResponse(400, { error: `Missing required field: ${field}` });
    }
  }

  if (wordData.user_id) {
    const verifyQuery = 'SELECT id FROM app_8b514_languages WHERE id = $1 AND user_id = $2';
    const verifyResult = await executeQuery(verifyQuery, [wordData.language_id, wordData.user_id]);

    if (!verifyResult.length) {
      return lambdaResponse(404, { error: 'Language not found or access denied' });
    }
  }

  const pos = wordData.pos || [];
  const isRoot = wordData.is_root || false;
  const embedding = wordData.embedding || null;

  const query = `
    INSERT INTO app_8b514_words (language_id, word, ipa, pos, is_root, embedding)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const result = await executeQuery(query, [
    wordData.language_id,
    wordData.word,
    wordData.ipa,
    pos,
    isRoot,
    embedding
  ]);

  const wordId = result[0].id;
  const translations: any[] = [];

  if (wordData.translations) {
    for (const translation of wordData.translations) {
      if (translation.meaning) {
        const insertTranslationQuery = `
          INSERT INTO app_8b514_translations (word_id, language_code, meaning)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
        const translationResult = await executeQuery(insertTranslationQuery, [
          wordId,
          translation.language_code || 'en',
          translation.meaning
        ]);
        if (translationResult.length) {
          translations.push(translationResult[0]);
        }
      }
    }
  }

  const wordResult = result[0];
  wordResult.translations = translations;

  return lambdaResponse(201, wordResult);
}

async function updateWord(wordId: string, wordData: any): Promise<APIGatewayProxyResult> {
  if (!wordId) {
    return lambdaResponse(400, { error: 'Word ID is required' });
  }

  if (wordData.user_id) {
    const verifyQuery = `
      SELECT w.id FROM app_8b514_words w
      JOIN app_8b514_languages l ON w.language_id = l.id
      WHERE w.id = $1 AND l.user_id = $2
    `;
    const verifyResult = await executeQuery(verifyQuery, [wordId, wordData.user_id]);

    if (!verifyResult.length) {
      return lambdaResponse(404, { error: 'Word not found or access denied' });
    }
  }

  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (wordData.word) {
    updateFields.push(`word = $${paramIndex++}`);
    params.push(wordData.word);
  }

  if (wordData.ipa) {
    updateFields.push(`ipa = $${paramIndex++}`);
    params.push(wordData.ipa);
  }

  if (wordData.pos) {
    updateFields.push(`pos = $${paramIndex++}`);
    params.push(wordData.pos);
  }

  if (wordData.is_root !== undefined) {
    updateFields.push(`is_root = $${paramIndex++}`);
    params.push(wordData.is_root);
  }

  if (wordData.embedding !== undefined) {
    updateFields.push(`embedding = $${paramIndex++}`);
    params.push(wordData.embedding);
  }

  if (!updateFields.length) {
    return lambdaResponse(400, { error: 'No fields to update' });
  }

  params.push(wordId);
  const query = `
    UPDATE app_8b514_words 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await executeQuery(query, params);

  if (!result.length) {
    return lambdaResponse(404, { error: 'Word not found' });
  }

  if (wordData.translations) {
    await executeQuery('DELETE FROM app_8b514_translations WHERE word_id = $1', [wordId]);

    for (const translation of wordData.translations) {
      if (translation.meaning) {
        const insertTranslationQuery = `
          INSERT INTO app_8b514_translations (word_id, language_code, meaning)
          VALUES ($1, $2, $3)
        `;
        await executeQuery(insertTranslationQuery, [
          wordId,
          translation.language_code || 'en',
          translation.meaning
        ]);
      }
    }
  }

  return lambdaResponse(200, result[0]);
}

async function deleteWord(wordId: string, userId?: string): Promise<APIGatewayProxyResult> {
  if (!wordId) {
    return lambdaResponse(400, { error: 'Word ID is required' });
  }

  let query: string;
  let params: any[];

  if (userId) {
    query = `
      DELETE FROM app_8b514_words 
      WHERE id = $1 AND language_id IN (
        SELECT id FROM app_8b514_languages WHERE user_id = $2
      )
      RETURNING id
    `;
    params = [wordId, userId];
  } else {
    query = 'DELETE FROM app_8b514_words WHERE id = $1 RETURNING id';
    params = [wordId];
  }

  const result = await executeQuery(query, params);

  if (!result.length) {
    return lambdaResponse(404, { error: 'Word not found or access denied' });
  }

  return lambdaResponse(200, { message: 'Word deleted successfully', id: result[0].id });
}