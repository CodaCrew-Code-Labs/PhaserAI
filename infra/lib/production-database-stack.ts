import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface ProductionDatabaseStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
}

export class ProductionDatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly databaseSecret: secretsmanager.Secret;
  public readonly vpc: ec2.Vpc;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  public readonly databaseSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: ProductionDatabaseStackProps) {
    super(scope, id, props);

    const { appName, environment } = props;

    // Create production VPC with proper subnet configuration
    this.vpc = new ec2.Vpc(this, 'ProductionVPC', {
      maxAzs: 2,
      natGateways: 1, // NAT Gateway for Lambda internet access
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Create database credentials secret
    this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: `${appName}-${environment}-prod-db-credentials`,
      description: 'Production RDS PostgreSQL credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'phaserai_admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        passwordLength: 32,
      },
    });

    // Create security group for RDS
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: false,
    });

    // Create security group for Lambda functions
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions accessing RDS',
      allowAllOutbound: true,
    });

    // Allow Lambda to access RDS
    this.databaseSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'PostgreSQL access from Lambda'
    );

    // Create RDS subnet group for isolated subnets
    const subnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc: this.vpc,
      description: 'Subnet group for RDS PostgreSQL',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // Create RDS PostgreSQL instance
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_8, // Use a supported version
      }),
      instanceType: environment === 'prod' 
        ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL)
        : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      
      credentials: rds.Credentials.fromSecret(this.databaseSecret),
      databaseName: `${appName}_${environment}`.replace('-', '_'),
      
      vpc: this.vpc,
      subnetGroup,
      securityGroups: [this.databaseSecurityGroup],
      
      // Storage configuration
      allocatedStorage: environment === 'prod' ? 100 : 20,
      storageType: rds.StorageType.GP2,
      storageEncrypted: true,
      
      // Backup configuration
      backupRetention: environment === 'prod' ? cdk.Duration.days(7) : cdk.Duration.days(1),
      deleteAutomatedBackups: environment !== 'prod',
      
      // Maintenance and monitoring
      autoMinorVersionUpgrade: true,
      monitoringInterval: environment === 'prod' ? cdk.Duration.seconds(60) : undefined,
      enablePerformanceInsights: environment === 'prod',
      
      // Multi-AZ for production
      multiAz: environment === 'prod',
      
      // Deletion protection
      deletionProtection: environment === 'prod',
      
      // Removal policy
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.instanceEndpoint.hostname,
      description: 'RDS PostgreSQL endpoint',
      exportName: `${appName}-${environment}-prod-db-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabasePort', {
      value: this.database.instanceEndpoint.port.toString(),
      description: 'RDS PostgreSQL port',
      exportName: `${appName}-${environment}-prod-db-port`,
    });

    new cdk.CfnOutput(this, 'DatabaseName', {
      value: `${appName}_${environment}`.replace('-', '_'),
      description: 'Database name',
      exportName: `${appName}-${environment}-prod-db-name`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database credentials secret ARN',
      exportName: `${appName}-${environment}-prod-db-secret-arn`,
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for database access',
      exportName: `${appName}-${environment}-prod-vpc-id`,
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: this.lambdaSecurityGroup.securityGroupId,
      description: 'Security group ID for Lambda functions',
      exportName: `${appName}-${environment}-prod-lambda-sg-id`,
    });

    // Connection string format for reference
    new cdk.CfnOutput(this, 'ConnectionStringFormat', {
      value: `postgresql://username:password@${this.database.instanceEndpoint.hostname}:${this.database.instanceEndpoint.port}/${appName}_${environment}`.replace('-', '_'),
      description: 'Connection string format (replace username:password with actual credentials)',
    });
  }

  // Method to allow access from external security groups
  public allowAccessFrom(securityGroup: ec2.SecurityGroup, description: string): void {
    this.databaseSecurityGroup.addIngressRule(
      securityGroup,
      ec2.Port.tcp(5432),
      description
    );
  }
}