import { Amplify } from 'aws-amplify'

export function bootstrapAmplify() {
  if (import.meta.env.VITE_AUTH_MODE !== 'cognito') return

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID!,
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID!,
        identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID!,
        loginWith: { email: true },
      },
    },
  })
}
