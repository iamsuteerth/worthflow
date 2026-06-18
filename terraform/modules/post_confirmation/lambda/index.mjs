import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const client = new CognitoIdentityProviderClient({})

export const handler = async (event) => {
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        UserAttributes: [
          { Name: 'custom:member_since', Value: new Date().toISOString() },
        ],
      })
    )
  }
  return event
}
