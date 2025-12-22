import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface Ec2WebStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
  vpc: ec2.Vpc;
  ecrRepository: ecr.Repository;
  databaseSecretArn: string;
  databaseEndpoint: string;
  databaseSecurityGroupId: string;
}

export class Ec2WebStack extends cdk.Stack {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly autoScalingGroup: autoscaling.AutoScalingGroup;
  public readonly webSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: Ec2WebStackProps) {
    super(scope, id, props);

    const { appName, environment, vpc, ecrRepository, databaseSecretArn, databaseEndpoint, databaseSecurityGroupId } = props;

    // Create security group for web servers
    this.webSecurityGroup = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
      vpc,
      description: `Security group for ${appName} web servers`,
      allowAllOutbound: true,
    });

    // Allow HTTP traffic from ALB
    this.webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from anywhere'
    );

    // Allow HTTPS traffic from ALB
    this.webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from anywhere'
    );

    // Allow SSH access (optional - for debugging)
    this.webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access'
    );

    // Allow web servers to access database (will be added to database security group externally)
    // Add ingress rule to database security group to allow access from web servers
    const databaseSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'DatabaseSecurityGroup',
      databaseSecurityGroupId
    );
    
    databaseSecurityGroup.addIngressRule(
      this.webSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow web servers to access PostgreSQL'
    );

    // Create IAM role for EC2 instances
    const ec2Role = new iam.Role(this, 'Ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: `IAM role for ${appName} EC2 web servers`,
    });

    // Grant ECR permissions
    ecrRepository.grantPull(ec2Role);

    // Grant access to database secret
    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
        ],
        resources: [databaseSecretArn],
      })
    );

    // Grant CloudWatch logs permissions
    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams',
        ],
        resources: [`arn:aws:logs:${this.region}:${this.account}:*`],
      })
    );

    // Grant Systems Manager permissions for session manager
    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    // Create instance profile
    const instanceProfile = new iam.InstanceProfile(this, 'InstanceProfile', {
      role: ec2Role,
    });

    // Create CloudWatch log group
    const logGroup = new logs.LogGroup(this, 'WebServerLogs', {
      logGroupName: `/aws/ec2/${appName}-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // User data script to set up Docker and run the application
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      // Update system
      'yum update -y',
      
      // Install Docker
      'yum install -y docker',
      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',
      
      // Install AWS CLI v2
      'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
      'unzip awscliv2.zip',
      './aws/install',
      
      // Install CloudWatch agent
      'yum install -y amazon-cloudwatch-agent',
      
      // Get AWS region and account info
      'export AWS_DEFAULT_REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)',
      'export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)',
      
      // Login to ECR
      `aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin ${this.account}.dkr.ecr.${this.region}.amazonaws.com`,
      
      // Get database credentials from Secrets Manager
      `export DB_SECRET=$(aws secretsmanager get-secret-value --secret-id ${databaseSecretArn} --query SecretString --output text)`,
      'export DB_USERNAME=$(echo $DB_SECRET | jq -r .username)',
      'export DB_PASSWORD=$(echo $DB_SECRET | jq -r .password)',
      `export DATABASE_URL="postgresql://$DB_USERNAME:$DB_PASSWORD@${databaseEndpoint}:5432/phaserai"`,
      
      // Pull and run the Docker image
      `docker pull ${ecrRepository.repositoryUri}:phaserai-master`,
      


      '[Unit]',
      'Description=PhaserAI Web Application',
      'After=docker.service',
      'Requires=docker.service',
      '',
      '[Service]',
      'Type=simple',
      'Restart=always',
      'RestartSec=5',
      'User=root',
      `Environment=DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@${databaseEndpoint}:5432/phaserai`,
      'Environment=NODE_ENV=production',
      'Environment=PORT=80',
      `ExecStartPre=-/usr/bin/docker stop phaserai-app`,
      `ExecStartPre=-/usr/bin/docker rm phaserai-app`,
      `ExecStartPre=/usr/bin/docker pull ${ecrRepository.repositoryUri}:phaserai-master`,
      `ExecStart=/usr/bin/docker run --name phaserai-app -p 80:80 --env DATABASE_URL --env NODE_ENV --env PORT ${ecrRepository.repositoryUri}:phaserai-master`,
      `ExecStop=/usr/bin/docker stop phaserai-app`,
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      
      // Enable and start the service



      
      // Set up log forwarding to CloudWatch
      'cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF',
      '{',
      '  "logs": {',
      '    "logs_collected": {',
      '      "files": {',
      '        "collect_list": [',
      '          {',
      `            "file_path": "/var/log/messages",`,
      `            "log_group_name": "${logGroup.logGroupName}",`,
      '            "log_stream_name": "{instance_id}/system"',
      '          }',
      '        ]',
      '      }',
      '    }',
      '  }',
      '}',
      'EOF',
      
      // Start CloudWatch agent
      '/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s'
    );

    // Create launch template
    const launchTemplate = new ec2.LaunchTemplate(this, 'LaunchTemplate', {
      launchTemplateName: `${appName}-${environment}-web-template`,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      securityGroup: this.webSecurityGroup,
      role: ec2Role,
      userData,
      keyName: undefined, // Use Session Manager instead of SSH keys
    });

    // Create Auto Scaling Group
    this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      vpc,
      launchTemplate,
      minCapacity: 1,
      maxCapacity: 3,
      desiredCapacity: 1,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Use public subnets for direct internet access
      },
      healthCheck: autoscaling.HealthCheck.elb({
        grace: cdk.Duration.minutes(5),
      }),
    });

    // Create Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
      loadBalancerName: `${appName}-${environment}-alb`,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // Create target group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.autoScalingGroup],
      healthCheck: {
        enabled: true,
        path: '/',
        healthyHttpCodes: '200,301,302',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // Create HTTP listener
    this.loadBalancer.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup],
    });

    // Auto scaling policies
    this.autoScalingGroup.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerUrl', {
      value: `http://${this.loadBalancer.loadBalancerDnsName}`,
      description: 'URL of the web application',
      exportName: `${appName}-web-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'DNS name of the load balancer',
      exportName: `${appName}-web-dns-${environment}`,
    });

    new cdk.CfnOutput(this, 'AutoScalingGroupName', {
      value: this.autoScalingGroup.autoScalingGroupName,
      description: 'Auto Scaling Group name',
      exportName: `${appName}-asg-name-${environment}`,
    });

    // Add tags
    cdk.Tags.of(this).add('Application', appName);
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Stack', 'EC2Web');
  }
}