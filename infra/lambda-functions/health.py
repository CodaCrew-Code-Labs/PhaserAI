import json

def handler(event, context):
    """Simple health check endpoint"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        'body': json.dumps({
            'status': 'healthy',
            'message': 'API is working!',
            'timestamp': context.aws_request_id
        })
    }