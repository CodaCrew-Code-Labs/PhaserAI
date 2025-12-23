import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ProductionApiStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  databaseSecretArn: string;
  databaseEndpoint: string;
  lambdaSecurityGroup: ec2.ISecurityGroup;
}

export class ProductionApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ProductionApiStackProps) {
    super(scope, id, props);

    const { vpc, databaseSecretArn, databaseEndpoint, lambdaSecurityGroup } = props;



    // Common Lambda function configuration
    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.seconds(30),
      environment: {
        SECRET_ARN: databaseSecretArn,
        DB_ENDPOINT: databaseEndpoint,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    };

    // Health check function (no database required)
    const healthFunction = new lambda.Function(this, 'HealthFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'health.handler',
      code: lambda.Code.fromAsset('lambda-functions-nodejs/lambda-package.zip'),
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Users Lambda function
    const usersFunction = new lambda.Function(this, 'UsersFunction', {
      ...commonLambdaProps,
      handler: 'users.handler',
      code: lambda.Code.fromAsset('lambda-functions-nodejs/lambda-package.zip'),
    });

    // Languages Lambda function
    const languagesFunction = new lambda.Function(this, 'LanguagesFunction', {
      ...commonLambdaProps,
      handler: 'languages.handler',
      code: lambda.Code.fromAsset('lambda-functions-nodejs/lambda-package.zip'),
    });

    // Words Lambda function
    const wordsFunction = new lambda.Function(this, 'WordsFunction', {
      ...commonLambdaProps,
      handler: 'words.handler',
      code: lambda.Code.fromAsset('lambda-functions-nodejs/lambda-package.zip'),
    });

    // Add permissions to read from Secrets Manager
    const secretsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [databaseSecretArn],
    });

    usersFunction.addToRolePolicy(secretsPolicy);
    languagesFunction.addToRolePolicy(secretsPolicy);
    wordsFunction.addToRolePolicy(secretsPolicy);

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'PhaserAiProductionApi', {
      restApiName: 'PhaserAI Production API',
      description: 'Production API for PhaserAI conlang application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Create API resources and methods
    
    // /health resource
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthFunction));
    
    // /users resource
    const usersResource = this.api.root.addResource('users');
    const userResource = usersResource.addResource('{userId}');
    
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(usersFunction));
    userResource.addMethod('GET', new apigateway.LambdaIntegration(usersFunction));
    userResource.addMethod('PUT', new apigateway.LambdaIntegration(usersFunction));

    // /languages resource
    const languagesResource = this.api.root.addResource('languages');
    const languageResource = languagesResource.addResource('{languageId}');
    
    languagesResource.addMethod('GET', new apigateway.LambdaIntegration(languagesFunction));
    languagesResource.addMethod('POST', new apigateway.LambdaIntegration(languagesFunction));
    languageResource.addMethod('GET', new apigateway.LambdaIntegration(languagesFunction));
    languageResource.addMethod('PUT', new apigateway.LambdaIntegration(languagesFunction));
    languageResource.addMethod('DELETE', new apigateway.LambdaIntegration(languagesFunction));

    // /users/{userId}/languages resource
    const userLanguagesResource = userResource.addResource('languages');
    userLanguagesResource.addMethod('GET', new apigateway.LambdaIntegration(languagesFunction));

    // /words resource
    const wordsResource = this.api.root.addResource('words');
    const wordResource = wordsResource.addResource('{wordId}');
    
    wordsResource.addMethod('GET', new apigateway.LambdaIntegration(wordsFunction));
    wordsResource.addMethod('POST', new apigateway.LambdaIntegration(wordsFunction));
    wordResource.addMethod('GET', new apigateway.LambdaIntegration(wordsFunction));
    wordResource.addMethod('PUT', new apigateway.LambdaIntegration(wordsFunction));
    wordResource.addMethod('DELETE', new apigateway.LambdaIntegration(wordsFunction));

    // /languages/{languageId}/words resource
    const languageWordsResource = languageResource.addResource('words');
    languageWordsResource.addMethod('GET', new apigateway.LambdaIntegration(wordsFunction));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Production API Gateway URL',
      exportName: `${this.stackName}-api-url`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'Production API Gateway ID',
    });
  }
}