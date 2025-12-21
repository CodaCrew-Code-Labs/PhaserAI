import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface CognitoAuthStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
  googleClientId?: string;
  googleClientSecret?: string;
  callbackUrls: string[];
  logoutUrls: string[];
}

export class CognitoAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: CognitoAuthStackProps) {
    super(scope, id, props);

    const { appName, environment, googleClientId, googleClientSecret, callbackUrls, logoutUrls } = props;

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${appName}-users-${environment}`,
      
      // Sign-in options
      signInAliases: {
        email: true,
        username: false,
      },
      
      // Self sign-up enabled
      selfSignUpEnabled: true,
      
      // Email verification
      autoVerify: {
        email: true,
      },
      
      // User attributes
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        preferredUsername: {
          required: false,
          mutable: true,
        },
      },
      
      // Password policy
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      
      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      
      // Email settings (using Cognito default)
      email: cognito.UserPoolEmail.withCognito(),
      
      // Removal policy (DESTROY for dev, RETAIN for prod)
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Add Google Identity Provider (if credentials provided)
    let googleProvider: cognito.UserPoolIdentityProviderGoogle | undefined;
    
    if (googleClientId && googleClientSecret) {
      googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
        userPool: this.userPool,
        clientId: googleClientId,
        clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          preferredUsername: cognito.ProviderAttribute.GOOGLE_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      });
    }

    // Create User Pool Domain (for hosted UI)
    // Domain prefix must be lowercase alphanumeric with hyphens only
    const domainPrefix = `${appName}-${environment}-auth`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    this.userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix,
      },
    });

    // Create User Pool Client
    const supportedIdentityProviders = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
    ];
    
    if (googleProvider) {
      supportedIdentityProviders.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
    }

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${appName}-web-client-${environment}`,
      
      // Auth flows
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      
      // OAuth settings
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls,
        logoutUrls,
      },
      
      // Identity providers
      supportedIdentityProviders,
      
      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      
      // Prevent user existence errors
      preventUserExistenceErrors: true,
      
      // Generate secret (false for public clients like SPAs)
      generateSecret: false,
    });

    // Ensure Google provider is created before the client
    if (googleProvider) {
      this.userPoolClient.node.addDependency(googleProvider);
    }

    // Outputs for your .env file
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${appName}-${environment}-user-pool-id`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${appName}-${environment}-client-id`,
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: `${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito Hosted UI Domain',
      exportName: `${appName}-${environment}-cognito-domain`,
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
      exportName: `${appName}-${environment}-region`,
    });

    // Output .env format for convenience
    new cdk.CfnOutput(this, 'EnvFileContent', {
      value: [
        `VITE_COGNITO_USER_POOL_ID=${this.userPool.userPoolId}`,
        `VITE_COGNITO_CLIENT_ID=${this.userPoolClient.userPoolClientId}`,
        `VITE_AWS_REGION=${this.region}`,
        `VITE_COGNITO_DOMAIN=${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      ].join('\n'),
      description: 'Copy these to your .env file',
    });
  }
}
