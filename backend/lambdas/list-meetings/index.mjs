import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const r = await ddb.send(new QueryCommand({
    TableName: process.env.MEETINGS_TABLE,
    IndexName: 'byTimestamp',
    KeyConditionExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': userId },
    ScanIndexForward: false,
    Limit: 50,
  }));
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*' },
    body: JSON.stringify(
      r.Items.map(i => ({
        meetingId: i.meetingId,
        title: i.title,
        timestamp: i.timestamp,
        summarySnippet: (i.summary || '').slice(0, 160),
      }))
    ),
  };
};
