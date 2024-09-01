/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten


export const createQChatRequest = /* GraphQL */ `
  mutation CreateQChatRequest(
    $condition: ModelQChatRequestConditionInput
    $input: CreateQChatRequestInput!
  ) {
    createQChatRequest(condition: $condition, input: $input) {
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

export const deleteQChatRequest = /* GraphQL */ `
  mutation DeleteQChatRequest(
    $condition: ModelQChatRequestConditionInput
    $input: DeleteQChatRequestInput!
  ) {
    deleteQChatRequest(condition: $condition, input: $input) {
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

export const updateQChatRequest = /* GraphQL */ `
  mutation UpdateQChatRequest(
    $condition: ModelQChatRequestConditionInput
    $input: UpdateQChatRequestInput!
  ) {
    updateQChatRequest(condition: $condition, input: $input) {
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

