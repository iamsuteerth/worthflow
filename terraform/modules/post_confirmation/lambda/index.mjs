import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const client = new CognitoIdentityProviderClient({})

export const handler = async (event) => {
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    try {
      await client.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: event.userPoolId,
          Username: event.userName,
          UserAttributes: [
            { Name: 'custom:member_since', Value: new Date().toISOString() },
          ],
        })
      )
    } catch (err) {
      console.error('Failed to set member_since (non-fatal):', err)
    }
  }
  return event
}
