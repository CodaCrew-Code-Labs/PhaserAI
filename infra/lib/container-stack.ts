import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ContainerStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
  vpc: ec2.Vpc;
  ecrRepository: ecr.Repository;
  databaseSecretArn?: string;
}

export class ContainerStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ContainerStackProps) {
    super(scope, id, props);

    const { appName, environment, vpc, ecrRepository, databaseSecretArn } = props;

    // Create ECS cluster
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: `${appName}-cluster-${environment}`,
      vpc,
      containerInsights: true,
    });

    // Create log group for container logs
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/${appName}-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: `${appName}-task-${environment}`,
      cpu: 256,
      memoryLimitMiB: 512,
    });

    // Add container to task definition
    const container = taskDefinition.addContainer('AppContainer', {
      containerName: `${appName}-container`,
      image: ecs.ContainerImage.fromEcrRepository(ecrRepository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'ecs',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '80',
      },
      secrets: databaseSecretArn ? {
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          cdk.aws_secretsmanager.Secret.fromSecretCompleteArn(this, 'DatabaseSecret', databaseSecretArn)
        ),
      } : undefined,
    });

    // Add port mapping
    container.addPortMappings({
      containerPort: 80,
      protocol: ecs.Protocol.TCP,
    });

    // Create security group for ECS service
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      description: `Security group for ${appName} ECS service`,
      allowAllOutbound: true,
    });

    // Create Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
      loadBalancerName: `${appName}-alb-${environment}`,
    });

    // Create security group for ALB
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: `Security group for ${appName} ALB`,
      allowAllOutbound: true,
    });

    // Allow HTTP traffic to ALB
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );

    // Allow HTTPS traffic to ALB
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    // Allow ALB to communicate with ECS
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(80),
      'Allow ALB to ECS'
    );

    // Create target group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: '/',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // Create listener
    this.loadBalancer.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup],
    });

    // Create ECS service
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition,
      serviceName: `${appName}-service-${environment}`,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // Attach service to target group
    this.service.attachToApplicationTargetGroup(targetGroup);

    // Grant ECR permissions to task role
    ecrRepository.grantPull(taskDefinition.taskRole);

    // If database secret is provided, grant access
    if (databaseSecretArn) {
      const taskRole = taskDefinition.taskRole as iam.Role;
      taskRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: [databaseSecretArn],
        })
      );
    }

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'DNS name of the load balancer',
      exportName: `${appName}-alb-dns-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoadBalancerUrl', {
      value: `http://${this.loadBalancer.loadBalancerDnsName}`,
      description: 'URL of the application',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster name',
      exportName: `${appName}-cluster-name-${environment}`,
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Service name',
      exportName: `${appName}-service-name-${environment}`,
    });

    // Add tags
    cdk.Tags.of(this).add('Application', appName);
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Stack', 'Container');
  }
}