import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { transcript, audioKey, meetingTitle, zoomMeetingNumber } = JSON.parse(event.body);
  const meetingId = randomUUID();

  await ddb.send(new PutCommand({
    TableName: process.env.MEETINGS_TABLE,
    Item: {
      userId,
      meetingId,
      timestamp: Date.now(),
      title: meetingTitle || 'Untitled meeting',
      transcript,
      audioKey,
      zoomMeetingNumber: zoomMeetingNumber || null,
      summary: null,
    },
  }));

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*' },
    body: JSON.stringify({ meetingId }),
  };
};
