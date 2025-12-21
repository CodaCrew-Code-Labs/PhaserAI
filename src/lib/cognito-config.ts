// AWS Cognito Configuration
// You'll need to create a Cognito User Pool in AWS Console and fill in these values

export const cognitoConfig = {
  // User Pool configuration
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  
  // Region where your Cognito User Pool is created
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  
  // OAuth configuration for Google Sign-In
  oauth: {
    domain: import.meta.env.VITE_COGNITO_DOMAIN || '', // e.g., 'your-domain.auth.us-east-1.amazoncognito.com'
    scopes: ['email', 'openid', 'profile'],
    redirectSignIn: import.meta.env.VITE_COGNITO_REDIRECT_SIGNIN || 'http://localhost:5173/dashboard',
    redirectSignOut: import.meta.env.VITE_COGNITO_REDIRECT_SIGNOUT || 'http://localhost:5173/',
    responseType: 'code' as const,
  },
};

// Amplify Auth configuration format
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.userPoolClientId,
      loginWith: {
        oauth: {
          domain: cognitoConfig.oauth.domain,
          scopes: cognitoConfig.oauth.scopes,
          redirectSignIn: [cognitoConfig.oauth.redirectSignIn],
          redirectSignOut: [cognitoConfig.oauth.redirectSignOut],
          responseType: cognitoConfig.oauth.responseType,
        },
      },
    },
  },
};
