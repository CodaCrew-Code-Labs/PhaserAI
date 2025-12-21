import json
import boto3
import psycopg2
import os
from typing import Dict, Any, Optional

def get_db_connection():
    """Get database connection using credentials from Secrets Manager"""
    secrets_client = boto3.client('secretsmanager')
    secret_response = secrets_client.get_secret_value(SecretId=os.environ['SECRET_ARN'])
    secret = json.loads(secret_response['SecretString'])
    
    return psycopg2.connect(
        host=secret['host'],
        port=secret['port'],
        database=secret['dbname'],
        user=secret['username'],
        password=secret['password']
    )

def execute_query(query: str, params: tuple = None, fetch: bool = True):
    """Execute a database query"""
    connection = get_db_connection()
    cursor = connection.cursor()
    
    try:
        cursor.execute(query, params)
        
        if fetch:
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            result = [dict(zip(columns, row)) for row in rows]
        else:
            result = cursor.rowcount
        
        # Always commit for write operations
        connection.commit()
        return result
    except Exception as e:
        connection.rollback()
        raise e
    finally:
        cursor.close()
        connection.close()

def lambda_response(status_code: int, body: Any, headers: Optional[Dict] = None):
    """Create a standardized Lambda response"""
    default_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
    
    if headers:
        default_headers.update(headers)
    
    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(body, default=str)  # default=str handles datetime serialization
    }

def extract_path_params(event: Dict) -> Dict:
    """Extract path parameters from API Gateway event"""
    return event.get('pathParameters') or {}

def extract_query_params(event: Dict) -> Dict:
    """Extract query parameters from API Gateway event"""
    return event.get('queryStringParameters') or {}

def extract_body(event: Dict) -> Dict:
    """Extract and parse JSON body from API Gateway event"""
    body = event.get('body', '{}')
    if isinstance(body, str):
        return json.loads(body) if body else {}
    return body