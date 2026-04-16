import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const q = (event.queryStringParameters?.q || '').toLowerCase();

  if (!q) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*' },
      body: '[]',
    };
  }

  const r = await ddb.send(new QueryCommand({
    TableName: process.env.MEETINGS_TABLE,
    KeyConditionExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': userId },
  }));

  const matches = r.Items.filter(i => {
    const transcriptStr = (i.transcript || [])
      .map(e => (typeof e === 'string' ? e : e.text))
      .join(' ');
    const hay = (i.title + ' ' + (i.summary || '') + ' ' + transcriptStr).toLowerCase();
    return hay.includes(q);
  }).map(i => ({
    meetingId: i.meetingId,
    title: i.title,
    timestamp: i.timestamp,
    summarySnippet: (i.summary || '').slice(0, 160),
  }));

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*' },
    body: JSON.stringify(matches),
  };
};
