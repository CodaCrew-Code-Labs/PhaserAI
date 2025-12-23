import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface MigrationStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  databaseSecretArn: string;
  databaseEndpoint: string;
  lambdaSecurityGroup: ec2.ISecurityGroup;
}

export class MigrationStack extends cdk.Stack {
  public readonly migrationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: MigrationStackProps) {
    super(scope, id, props);

    const { vpc, databaseSecretArn, databaseEndpoint, lambdaSecurityGroup } = props;



    // Create Lambda function for database migrations
    this.migrationFunction = new lambda.Function(this, 'MigrationFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'migration.handler',
      code: lambda.Code.fromAsset('lambda-functions-nodejs/lambda-package.zip'),
      architecture: lambda.Architecture.X86_64,
      timeout: cdk.Duration.minutes(15),
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        SECRET_ARN: databaseSecretArn,
        DB_ENDPOINT: databaseEndpoint,
        NODE_ENV: 'production',
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant permissions to read database secrets
    this.migrationFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [databaseSecretArn],
    }));

    // Grant VPC permissions
    this.migrationFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
        'ec2:AttachNetworkInterface',
        'ec2:DetachNetworkInterface',
      ],
      resources: ['*'],
    }));

    // Create custom resource for automatic migrations on deployment
    const migrationProvider = new cr.Provider(this, 'MigrationProvider', {
      onEventHandler: this.migrationFunction,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    new cdk.CustomResource(this, 'DatabaseMigration', {
      serviceToken: migrationProvider.serviceToken,
      properties: {
        action: 'up',
        timestamp: Date.now(), // Force update on every deployment
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'MigrationFunctionArn', {
      value: this.migrationFunction.functionArn,
      description: 'ARN of the migration Lambda function',
      exportName: `${this.stackName}-migration-function-arn`,
    });

    new cdk.CfnOutput(this, 'MigrationFunctionName', {
      value: this.migrationFunction.functionName,
      description: 'Name of the migration Lambda function',
      exportName: `${this.stackName}-migration-function-name`,
    });
  }
}