import json
import logging
from db_utils import execute_query, lambda_response, extract_path_params, extract_query_params, extract_body

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """Handle word-related API requests"""
    try:
        http_method = event['httpMethod']
        path_params = extract_path_params(event)
        query_params = extract_query_params(event)
        
        # Determine the route based on path
        resource_path = event.get('resource', '')
        
        if http_method == 'GET':
            if '/languages/{languageId}/words' in resource_path:
                return get_language_words(path_params.get('languageId'), query_params.get('userId'))
            elif '{wordId}' in resource_path:
                return get_word(path_params.get('wordId'), query_params.get('userId'))
            else:
                return get_words(query_params)
                
        elif http_method == 'POST':
            return create_word(extract_body(event))
            
        elif http_method == 'PUT':
            return update_word(path_params.get('wordId'), extract_body(event))
            
        elif http_method == 'DELETE':
            return delete_word(path_params.get('wordId'), query_params.get('userId'))
            
        else:
            return lambda_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error in words handler: {str(e)}")
        return lambda_response(500, {'error': str(e)})

def get_words(query_params: dict):
    """Get all words with optional filtering, including translations"""
    language_id = query_params.get('languageId')
    user_id = query_params.get('userId')
    
    if language_id and user_id:
        # Verify user owns the language
        verify_query = "SELECT id FROM app_8b514_languages WHERE id = %s AND user_id = %s"
        verify_result = execute_query(verify_query, (language_id, user_id))
        
        if not verify_result:
            return lambda_response(404, {'error': 'Language not found or access denied'})
        
        query = """
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
            WHERE w.language_id = %s
            GROUP BY w.id
            ORDER BY w.created_at DESC
        """
        result = execute_query(query, (language_id,))
    elif language_id:
        query = """
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
            WHERE w.language_id = %s
            GROUP BY w.id
            ORDER BY w.created_at DESC
        """
        result = execute_query(query, (language_id,))
    else:
        query = """
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
            GROUP BY w.id
            ORDER BY w.created_at DESC
        """
        result = execute_query(query)
    
    return lambda_response(200, result)

def get_language_words(language_id: str, user_id: str = None):
    """Get words for a specific language with translations"""
    if not language_id:
        return lambda_response(400, {'error': 'Language ID is required'})
    
    if user_id:
        # Verify user owns the language
        verify_query = "SELECT id FROM app_8b514_languages WHERE id = %s AND user_id = %s"
        verify_result = execute_query(verify_query, (language_id, user_id))
        
        if not verify_result:
            return lambda_response(404, {'error': 'Language not found or access denied'})
    
    # Get words with their translations
    query = """
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
        WHERE w.language_id = %s
        GROUP BY w.id
        ORDER BY w.created_at DESC
    """
    result = execute_query(query, (language_id,))
    
    return lambda_response(200, result)

def get_word(word_id: str, user_id: str = None):
    """Get a specific word with translations"""
    if not word_id:
        return lambda_response(400, {'error': 'Word ID is required'})
    
    if user_id:
        # Verify user owns the language that contains this word
        query = """
            SELECT w.* FROM app_8b514_words w
            JOIN app_8b514_languages l ON w.language_id = l.id
            WHERE w.id = %s AND l.user_id = %s
        """
        result = execute_query(query, (word_id, user_id))
    else:
        query = "SELECT * FROM app_8b514_words WHERE id = %s"
        result = execute_query(query, (word_id,))
    
    if not result:
        return lambda_response(404, {'error': 'Word not found'})
    
    word = result[0]
    
    # Get translations for this word
    translations_query = "SELECT * FROM app_8b514_translations WHERE word_id = %s ORDER BY created_at"
    translations = execute_query(translations_query, (word_id,))
    word['translations'] = translations or []
    
    return lambda_response(200, word)

def create_word(word_data: dict):
    """Create a new word"""
    required_fields = ['language_id', 'word', 'ipa']
    
    for field in required_fields:
        if field not in word_data:
            return lambda_response(400, {'error': f'Missing required field: {field}'})
    
    # Verify user owns the language if user_id provided
    if 'user_id' in word_data:
        verify_query = "SELECT id FROM app_8b514_languages WHERE id = %s AND user_id = %s"
        verify_result = execute_query(verify_query, (word_data['language_id'], word_data['user_id']))
        
        if not verify_result:
            return lambda_response(404, {'error': 'Language not found or access denied'})
    
    # Set defaults
    pos = word_data.get('pos', [])
    is_root = word_data.get('is_root', False)
    embedding = word_data.get('embedding')
    
    query = """
        INSERT INTO app_8b514_words (language_id, word, ipa, pos, is_root, embedding)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    
    result = execute_query(
        query,
        (
            word_data['language_id'],
            word_data['word'],
            word_data['ipa'],
            pos,
            is_root,
            embedding
        )
    )
    
    word_id = result[0]['id']
    
    # Handle translations if provided
    if 'translations' in word_data:
        for translation in word_data['translations']:
            if translation.get('meaning'):  # Only insert non-empty translations
                insert_translation_query = """
                    INSERT INTO app_8b514_translations (word_id, language_code, meaning)
                    VALUES (%s, %s, %s)
                """
                execute_query(insert_translation_query, (
                    word_id,
                    translation.get('language_code', 'en'),
                    translation['meaning']
                ))
    
    return lambda_response(201, result[0])

def update_word(word_id: str, word_data: dict):
    """Update an existing word"""
    if not word_id:
        return lambda_response(400, {'error': 'Word ID is required'})
    
    # Verify user owns the language if user_id provided
    if 'user_id' in word_data:
        verify_query = """
            SELECT w.id FROM app_8b514_words w
            JOIN app_8b514_languages l ON w.language_id = l.id
            WHERE w.id = %s AND l.user_id = %s
        """
        verify_result = execute_query(verify_query, (word_id, word_data['user_id']))
        
        if not verify_result:
            return lambda_response(404, {'error': 'Word not found or access denied'})
    
    # Build dynamic update query
    update_fields = []
    params = []
    
    if 'word' in word_data:
        update_fields.append('word = %s')
        params.append(word_data['word'])
    
    if 'ipa' in word_data:
        update_fields.append('ipa = %s')
        params.append(word_data['ipa'])
    
    if 'pos' in word_data:
        update_fields.append('pos = %s')
        params.append(word_data['pos'])
    
    if 'is_root' in word_data:
        update_fields.append('is_root = %s')
        params.append(word_data['is_root'])
    
    if 'embedding' in word_data:
        update_fields.append('embedding = %s')
        params.append(word_data['embedding'])
    
    if not update_fields:
        return lambda_response(400, {'error': 'No fields to update'})
    
    params.append(word_id)
    query = f"""
        UPDATE app_8b514_words 
        SET {', '.join(update_fields)}
        WHERE id = %s
        RETURNING *
    """
    
    result = execute_query(query, tuple(params))
    
    if not result:
        return lambda_response(404, {'error': 'Word not found'})
    
    # Handle translations update if provided
    if 'translations' in word_data:
        # Delete existing translations
        delete_translations_query = "DELETE FROM app_8b514_translations WHERE word_id = %s"
        execute_query(delete_translations_query, (word_id,))
        
        # Insert new translations
        for translation in word_data['translations']:
            if translation.get('meaning'):  # Only insert non-empty translations
                insert_translation_query = """
                    INSERT INTO app_8b514_translations (word_id, language_code, meaning)
                    VALUES (%s, %s, %s)
                """
                execute_query(insert_translation_query, (
                    word_id,
                    translation.get('language_code', 'en'),
                    translation['meaning']
                ))
    
    return lambda_response(200, result[0])

def delete_word(word_id: str, user_id: str = None):
    """Delete a word"""
    if not word_id:
        return lambda_response(400, {'error': 'Word ID is required'})
    
    if user_id:
        # Verify user owns the language that contains this word
        query = """
            DELETE FROM app_8b514_words 
            WHERE id = %s AND language_id IN (
                SELECT id FROM app_8b514_languages WHERE user_id = %s
            )
            RETURNING id
        """
        result = execute_query(query, (word_id, user_id))
    else:
        query = "DELETE FROM app_8b514_words WHERE id = %s RETURNING id"
        result = execute_query(query, (word_id,))
    
    if not result:
        return lambda_response(404, {'error': 'Word not found or access denied'})
    
    return lambda_response(200, {'message': 'Word deleted successfully', 'id': result[0]['id']})