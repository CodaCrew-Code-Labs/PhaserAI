import json
import logging
from db_utils import execute_query, lambda_response, extract_path_params, extract_body

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """Handle user-related API requests"""
    try:
        http_method = event['httpMethod']
        path_params = extract_path_params(event)
        
        if http_method == 'GET':
            return get_user(path_params.get('userId'))
        elif http_method == 'POST':
            return create_or_update_user(extract_body(event))
        elif http_method == 'PUT':
            return update_user(path_params.get('userId'), extract_body(event))
        else:
            return lambda_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        logger.error(f"Error in users handler: {str(e)}")
        return lambda_response(500, {'error': str(e)})

def get_user(user_id: str):
    """Get user by ID"""
    if not user_id:
        return lambda_response(400, {'error': 'User ID is required'})
    
    query = "SELECT * FROM app_8b514_users WHERE user_id = %s"
    result = execute_query(query, (user_id,))
    
    if not result:
        return lambda_response(404, {'error': 'User not found'})
    
    return lambda_response(200, result[0])

def create_or_update_user(user_data: dict):
    """Create or update user (upsert)"""
    required_fields = ['user_id', 'email', 'username']
    
    for field in required_fields:
        if field not in user_data:
            return lambda_response(400, {'error': f'Missing required field: {field}'})
    
    query = """
        INSERT INTO app_8b514_users (user_id, email, username)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            email = EXCLUDED.email,
            username = EXCLUDED.username
        RETURNING *
    """
    
    result = execute_query(
        query, 
        (user_data['user_id'], user_data['email'], user_data['username'])
    )
    
    return lambda_response(201, result[0])

def update_user(user_id: str, user_data: dict):
    """Update existing user"""
    if not user_id:
        return lambda_response(400, {'error': 'User ID is required'})
    
    # Build dynamic update query
    update_fields = []
    params = []
    
    if 'email' in user_data:
        update_fields.append('email = %s')
        params.append(user_data['email'])
    
    if 'username' in user_data:
        update_fields.append('username = %s')
        params.append(user_data['username'])
    
    if not update_fields:
        return lambda_response(400, {'error': 'No fields to update'})
    
    params.append(user_id)
    query = f"""
        UPDATE app_8b514_users 
        SET {', '.join(update_fields)}
        WHERE user_id = %s
        RETURNING *
    """
    
    result = execute_query(query, tuple(params))
    
    if not result:
        return lambda_response(404, {'error': 'User not found'})
    
    return lambda_response(200, result[0])