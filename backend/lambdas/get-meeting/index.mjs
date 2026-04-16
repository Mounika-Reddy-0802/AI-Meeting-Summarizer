import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const meetingId = event.pathParameters.id;

  const meeting = await ddb.send(new GetCommand({
    TableName: process.env.MEETINGS_TABLE,
    Key: { userId, meetingId },
  }));
  if (!meeting.Item) {
    return {
      statusCode: 404,
      headers: { 'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*' },
      body: JSON.stringify({ error: 'Not found' }),
    };
  }

  const items = await ddb.send(new QueryCommand({
    TableName: process.env.ACTION_ITEMS_TABLE,
    KeyConditionExpression: 'meetingId = :m',
    ExpressionAttributeValues: { ':m': meetingId },
  }));

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*' },
    body: JSON.stringify({ ...meeting.Item, actionItems: items.Items }),
  };
};
