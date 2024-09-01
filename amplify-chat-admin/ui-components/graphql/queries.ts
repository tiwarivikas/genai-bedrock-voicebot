/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getQChatRequest = /* GraphQL */ `
  query GetQChatRequest($id: ID!) {
    getQChatRequest(id: $id) {
      additional_sites
      bot_status
      chatbot_logo_url
      chatbotname
      createdAt
      customer
      docs
      expiry_datetime
      guardrails
      id
      initial_text
      qchatform_status
      requester_email
      token
      updatedAt
      website
      regionQ
      __typename
    }
  }
`;

export const listQChatRequests = /* GraphQL */ `
  query ListQChatRequests(
    $filter: ModelQChatRequestFilterInput
    $id: ID
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listQChatRequests(
      filter: $filter
      id: $id
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        additional_sites
        bot_status
        chatbot_logo_url
        chatbotname
        createdAt
        customer
        docs
        expiry_datetime
        guardrails
        id
        initial_text
        qchatform_status
        requester_email
        token
        updatedAt
        website
        regionQ
        __typename
      }
      nextToken
      __typename
    }
  }
`;

