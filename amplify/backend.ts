import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { imagesStorage } from './storage/resource';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';

// ES modules (amplify/package.json has "type": "module") have no __dirname.
// Recreate it from import.meta.url so lambda.Code.fromAsset can resolve a
// relative filesystem path to the bundled Python function.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = defineBackend({
  auth,
  data,
  imagesStorage
});

// ---------------------------------------------------------------------------
// Nearest-station lookup API (public Python Lambda behind an open REST API).
//
// Custom CDK stack holding:
//   - a Python Lambda that bundles lambda/station_id/ (lambda_function.py +
//     station-id.json) and serves nearest-station "STA" lookups via KD-tree;
//   - a REST API Gateway with a single public GET /station proxy resource so
//     the app can call it without authentication.
//
// The endpoint URL is surfaced to the frontend via backend.addOutput (custom),
// which lands in amplify_outputs.json under `custom.stationApiUrl`.
// ---------------------------------------------------------------------------
const stationStack = backend.createStack('StationIdStack');

const stationLambda = new lambda.Function(stationStack, 'StationIdLambda', {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: 'lambda_function.lambda_handler',
  timeout: cdk.Duration.seconds(10),
  memorySize: 512,
  code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'station_id')),
});

const stationApi = new apigw.LambdaRestApi(stationStack, 'StationIdApi', {
  handler: stationLambda,
  proxy: true,
  defaultMethodOptions: { authorizationType: apigw.AuthorizationType.NONE },
});

backend.addOutput({
  custom: {
    stationApiUrl: stationApi.url,
  },
});

