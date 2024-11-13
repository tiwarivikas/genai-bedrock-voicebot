const { v4: uuidv4 } = require("uuid");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

const dynamoClient = new DynamoDBClient({});
const TICKETS_TABLE = process.env.TICKETS_TABLE || "SupportTickets";

async function logSupportTicket(text) {
  try {
    // Generate a unique ticket ID
    const ticketId = uuidv4().substring(0, 8).toUpperCase();

    const ticket = {
      ticketId,
      text,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const params = {
      TableName: TICKETS_TABLE,
      Item: marshall(ticket),
    };

    await dynamoClient.send(new PutItemCommand(params));

    console.log("Support ticket created:", ticket);

    return {
      success: true,
      ticketId: ticketId,
    };
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return {
      success: false,
      error: "Failed to create support ticket",
    };
  }
}

module.exports = { logSupportTicket };
