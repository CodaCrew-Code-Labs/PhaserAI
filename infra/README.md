# PhaserAI Infrastructure

AWS CDK infrastructure for Cognito authentication.

## Prerequisites

- Node.js 18+
- AWS CLI configured with credentials
- AWS CDK CLI: `npm install -g aws-cdk`

## Setup

```bash
cd infra
npm install
```

## Bootstrap CDK (first time only)

If you've never used CDK in your AWS account/region:

```bash
cdk bootstrap
```

## Deploy

### Basic deployment (email/password auth only):

```bash
cdk deploy
```

### With Google OAuth:

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Set authorized redirect URI to: `https://<your-cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
3. Deploy with Google credentials:

```bash
cdk deploy \
  --context googleClientId=YOUR_GOOGLE_CLIENT_ID \
  --context googleClientSecret=YOUR_GOOGLE_CLIENT_SECRET
```

### For production:

```bash
cdk deploy \
  --context environment=prod \
  --context callbackUrls='["https://yourdomain.com/dashboard"]' \
  --context logoutUrls='["https://yourdomain.com/"]'
```

## After Deployment

The stack outputs will show the values you need. Copy them to your `.env` file:

```
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=us-east-1
VITE_COGNITO_DOMAIN=phaserai-dev-xxxxxxxx.auth.us-east-1.amazoncognito.com
VITE_COGNITO_REDIRECT_SIGNIN=http://localhost:5173/dashboard
VITE_COGNITO_REDIRECT_SIGNOUT=http://localhost:5173/
```

## Useful Commands

- `npm run build` - Compile TypeScript
- `npm run synth` - Synthesize CloudFormation template
- `npm run diff` - Compare deployed stack with current state
- `npm run deploy` - Deploy stack to AWS
- `npm run destroy` - Remove stack from AWS

## Stack Resources

This stack creates:

- **Cognito User Pool** - User directory with email sign-in
- **User Pool Client** - App client for your React app (no secret, SPA-friendly)
- **User Pool Domain** - Hosted UI domain for OAuth flows
- **Google Identity Provider** (optional) - If Google credentials provided
