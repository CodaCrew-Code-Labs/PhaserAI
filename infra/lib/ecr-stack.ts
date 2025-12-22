import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EcrStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
}

export class EcrStack extends cdk.Stack {
  public readonly repository: ecr.Repository;
  public readonly repositoryUri: string;

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    const { appName, environment } = props;

    // Create ECR repository for Docker images
    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: appName.toLowerCase(),
      imageScanOnPush: true, // Enable vulnerability scanning
      imageTagMutability: ecr.TagMutability.MUTABLE, // Allow tag updates
      lifecycleRules: [
        {
          // Keep last 10 phaserai-latest images
          rulePriority: 1,
          description: 'Keep last 10 phaserai-latest images',
          tagStatus: ecr.TagStatus.TAGGED,
          tagPrefixList: ['phaserai-latest'],
          maxImageCount: 10,
        },
        {
          // Keep phaserai branch images for 7 days
          rulePriority: 2,
          description: 'Keep phaserai branch images for 7 days',
          tagStatus: ecr.TagStatus.TAGGED,
          tagPrefixList: ['phaserai-main', 'phaserai-master', 'phaserai-develop'],
          maxImageAge: cdk.Duration.days(7),
        },
        {
          // Keep phaserai commit hash images for 3 days
          rulePriority: 3,
          description: 'Keep phaserai commit hash images for 3 days',
          tagStatus: ecr.TagStatus.TAGGED,
          tagPrefixList: ['phaserai-'],
          maxImageAge: cdk.Duration.days(3),
        },
        {
          // Clean up untagged images after 1 day
          rulePriority: 4,
          description: 'Clean up untagged images',
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageAge: cdk.Duration.days(1),
        },
      ],
    });

    // Store repository URI for easy access
    this.repositoryUri = this.repository.repositoryUri;

    // Create IAM role for GitHub Actions with OIDC
    const githubOidcRole = new iam.Role(this, 'GitHubActionsRole', {
      roleName: `${appName}-github-actions-ecr-${environment}`,
      description: 'Role for GitHub Actions to push to ECR',
      assumedBy: new iam.WebIdentityPrincipal(
        `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': [
              'repo:*:ref:refs/heads/main',
              'repo:*:ref:refs/heads/master',
              'repo:*:ref:refs/heads/develop',
            ],
          },
        }
      ),
    });

    // Grant ECR permissions to the GitHub Actions role
    this.repository.grantPullPush(githubOidcRole);

    // Add additional ECR permissions for image scanning and repository access
    githubOidcRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:StartImageScan',
          'ecr:DescribeImageScanFindings',
          'ecr:GetAuthorizationToken',
          'ecr:DescribeRepositories',
          'ecr:ListImages',
        ],
        resources: ['*'], // GetAuthorizationToken and DescribeRepositories require * resource
      })
    );

    // Add CloudFormation permissions to read stack outputs
    githubOidcRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:ListStackResources',
          'cloudformation:GetTemplate',
        ],
        resources: [
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/${appName}-ecr-${environment}/*`,
        ],
      })
    );

    // Create IAM user as fallback for environments that don't support OIDC
    const githubActionsUser = new iam.User(this, 'GitHubActionsUser', {
      userName: `${appName}-github-actions-ecr-${environment}`,
    });

    // Grant ECR permissions to the user
    this.repository.grantPullPush(githubActionsUser);
    githubActionsUser.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:StartImageScan',
          'ecr:DescribeImageScanFindings',
          'ecr:GetAuthorizationToken',
        ],
        resources: ['*'],
      })
    );

    // Create access key for the user (optional - only if OIDC is not used)
    const accessKey = new iam.AccessKey(this, 'GitHubActionsAccessKey', {
      user: githubActionsUser,
    });

    // Output important values
    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'ECR Repository URI for Docker images',
      exportName: `${appName}-ecr-repository-uri-${environment}`,
    });

    new cdk.CfnOutput(this, 'RepositoryArn', {
      value: this.repository.repositoryArn,
      description: 'ECR Repository ARN',
      exportName: `${appName}-ecr-repository-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'GitHubOidcRoleArn', {
      value: githubOidcRole.roleArn,
      description: 'IAM Role ARN for GitHub Actions OIDC',
      exportName: `${appName}-github-oidc-role-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'GitHubActionsUserArn', {
      value: githubActionsUser.userArn,
      description: 'IAM User ARN for GitHub Actions (fallback)',
      exportName: `${appName}-github-user-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'AccessKeyId', {
      value: accessKey.accessKeyId,
      description: 'Access Key ID for GitHub Actions user',
    });

    new cdk.CfnOutput(this, 'SecretAccessKey', {
      value: accessKey.secretAccessKey.unsafeUnwrap(),
      description: 'Secret Access Key for GitHub Actions user (store securely!)',
    });

    // Add tags
    cdk.Tags.of(this).add('Application', appName);
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Stack', 'ECR');
  }
}