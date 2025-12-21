import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface BastionStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
  databaseEndpoint: string;
  databaseSecretArn: string;
}

export class BastionStack extends cdk.Stack {
  public readonly bastionHost: ec2.Instance;

  constructor(scope: Construct, id: string, props: BastionStackProps) {
    super(scope, id, props);

    const { vpc, databaseSecurityGroup, databaseEndpoint, databaseSecretArn } = props;

    // Create security group for bastion host
    const bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
      vpc,
      description: 'Security group for bastion host',
      allowAllOutbound: true,
    });

    // Create IAM role for bastion host with SSM permissions
    const bastionRole = new iam.Role(this, 'BastionRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Create bastion host
    this.bastionHost = new ec2.Instance(this, 'BastionHost', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: bastionSecurityGroup,
      role: bastionRole,
      keyName: undefined, // We'll use SSM Session Manager instead of SSH keys
      userData: ec2.UserData.forLinux(),
    });

    // Install PostgreSQL client on bastion host
    this.bastionHost.userData.addCommands(
      'yum update -y',
      'yum install -y postgresql15',
      'echo "PostgreSQL client installed successfully" > /tmp/setup-complete.log'
    );

    // Outputs
    new cdk.CfnOutput(this, 'BastionInstanceId', {
      value: this.bastionHost.instanceId,
      description: 'Bastion host instance ID for SSM connection',
    });

    new cdk.CfnOutput(this, 'ConnectCommand', {
      value: `aws ssm start-session --target ${this.bastionHost.instanceId} --region ${this.region}`,
      description: 'Command to connect to bastion host via SSM',
    });

    new cdk.CfnOutput(this, 'DatabaseConnectionCommand', {
      value: `psql -h ${databaseEndpoint} -U phaserai_admin -d phaserai_dev`,
      description: 'Command to run inside bastion host to connect to database (get password from Secrets Manager)',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: databaseSecretArn,
      description: 'ARN of the secret containing database credentials',
    });

    new cdk.CfnOutput(this, 'BastionSecurityGroupId', {
      value: bastionSecurityGroup.securityGroupId,
      description: 'Bastion security group ID (add to DB security group ingress)',
    });

    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: databaseSecurityGroup.securityGroupId,
      description: 'Database security group ID',
    });
  }
}