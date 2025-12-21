import json
import logging
from db_utils import execute_query, lambda_response, extract_path_params, extract_query_params, extract_body

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """Handle language-related API requests"""
    try:
        http_method = event['httpMethod']
        path_params = extract_path_params(event)
        query_params = extract_query_params(event)
        
        # Determine the route based on path
        resource_path = event.get('resource', '')
        
        if http_method == 'GET':
            if '/users/{userId}/languages' in resource_path:
                return get_user_languages(path_params.get('userId'))
            elif '{languageId}' in resource_path:
                return get_language(path_params.get('languageId'), query_params.get('userId'))
            else:
                return get_languages(query_params)
                
        elif http_method == 'POST':
            return create_language(extract_body(event))
            
        elif http_method == 'PUT':
            return update_language(path_params.get('languageId'), extract_body(event))
            
        elif http_method == 'DELETE':
            return delete_language(path_params.get('languageId'), query_params.get('userId'))
            
        else:
            return lambda_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error in languages handler: {str(e)}")
        return lambda_response(500, {'error': str(e)})

def get_languages(query_params: dict):
    """Get all languages with optional filtering"""
    user_id = query_params.get('userId')
    
    if user_id:
        query = "SELECT * FROM app_8b514_languages WHERE user_id = %s ORDER BY created_at DESC"
        result = execute_query(query, (user_id,))
    else:
        query = "SELECT * FROM app_8b514_languages ORDER BY created_at DESC"
        result = execute_query(query)
    
    return lambda_response(200, result)

def get_user_languages(user_id: str):
    """Get languages for a specific user"""
    if not user_id:
        return lambda_response(400, {'error': 'User ID is required'})
    
    query = "SELECT * FROM app_8b514_languages WHERE user_id = %s ORDER BY created_at DESC"
    result = execute_query(query, (user_id,))
    
    return lambda_response(200, result)

def get_language(language_id: str, user_id: str = None):
    """Get a specific language"""
    if not language_id:
        return lambda_response(400, {'error': 'Language ID is required'})
    
    if user_id:
        # Verify user owns the language
        query = "SELECT * FROM app_8b514_languages WHERE id = %s AND user_id = %s"
        result = execute_query(query, (language_id, user_id))
    else:
        query = "SELECT * FROM app_8b514_languages WHERE id = %s"
        result = execute_query(query, (language_id,))
    
    if not result:
        return lambda_response(404, {'error': 'Language not found'})
    
    return lambda_response(200, result[0])

def create_language(language_data: dict):
    """Create a new language"""
    required_fields = ['user_id', 'name']
    
    for field in required_fields:
        if field not in language_data:
            return lambda_response(400, {'error': f'Missing required field: {field}'})
    
    # Set defaults
    phonemes = language_data.get('phonemes', {
        'consonants': [],
        'vowels': [],
        'diphthongs': []
    })
    alphabet_mappings = language_data.get('alphabet_mappings', {
        'consonants': {},
        'vowels': {},
        'diphthongs': {}
    })
    syllables = language_data.get('syllables', 'CV')
    rules = language_data.get('rules', '')
    
    query = """
        INSERT INTO app_8b514_languages (user_id, name, phonemes, alphabet_mappings, syllables, rules)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    
    result = execute_query(
        query,
        (
            language_data['user_id'],
            language_data['name'],
            json.dumps(phonemes),
            json.dumps(alphabet_mappings),
            syllables,
            rules
        )
    )
    
    return lambda_response(201, result[0])

def update_language(language_id: str, language_data: dict):
    """Update an existing language"""
    if not language_id:
        return lambda_response(400, {'error': 'Language ID is required'})
    
    # Build dynamic update query
    update_fields = []
    params = []
    
    if 'name' in language_data:
        update_fields.append('name = %s')
        params.append(language_data['name'])
    
    if 'phonemes' in language_data:
        update_fields.append('phonemes = %s')
        params.append(json.dumps(language_data['phonemes']))
    
    if 'alphabet_mappings' in language_data:
        update_fields.append('alphabet_mappings = %s')
        params.append(json.dumps(language_data['alphabet_mappings']))
    
    if 'syllables' in language_data:
        update_fields.append('syllables = %s')
        params.append(language_data['syllables'])
    
    if 'rules' in language_data:
        update_fields.append('rules = %s')
        params.append(language_data['rules'])
    
    if not update_fields:
        return lambda_response(400, {'error': 'No fields to update'})
    
    # Verify user owns the language if user_id provided
    if 'user_id' in language_data:
        verify_query = "SELECT user_id FROM app_8b514_languages WHERE id = %s"
        verify_result = execute_query(verify_query, (language_id,))
        
        if not verify_result:
            return lambda_response(404, {'error': 'Language not found'})
        
        if verify_result[0]['user_id'] != language_data['user_id']:
            return lambda_response(403, {'error': 'Access denied'})
    
    params.append(language_id)
    query = f"""
        UPDATE app_8b514_languages 
        SET {', '.join(update_fields)}
        WHERE id = %s
        RETURNING *
    """
    
    result = execute_query(query, tuple(params))
    
    if not result:
        return lambda_response(404, {'error': 'Language not found'})
    
    return lambda_response(200, result[0])

def delete_language(language_id: str, user_id: str = None):
    """Delete a language"""
    if not language_id:
        return lambda_response(400, {'error': 'Language ID is required'})
    
    if user_id:
        # Verify user owns the language
        query = "DELETE FROM app_8b514_languages WHERE id = %s AND user_id = %s RETURNING id"
        result = execute_query(query, (language_id, user_id))
    else:
        query = "DELETE FROM app_8b514_languages WHERE id = %s RETURNING id"
        result = execute_query(query, (language_id,))
    
    if not result:
        return lambda_response(404, {'error': 'Language not found or access denied'})
    
    return lambda_response(200, {'message': 'Language deleted successfully', 'id': result[0]['id']})