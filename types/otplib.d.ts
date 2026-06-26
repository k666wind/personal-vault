// Type declaration for @otplib/preset-browser which ships no .d.ts file.
// Covers only the surface area used by src/lib/totp.ts.
declare module '@otplib/preset-browser' {
  interface AuthenticatorOptions {
    digits?: number
    step?: number
    window?: number | [number, number]
  }

  interface Authenticator {
    options: AuthenticatorOptions
    generate(secret: string): string
    verify(opts: { token: string; secret: string }): boolean
    timeRemaining(): number
    timeUsed(): number
  }

  export const authenticator: Authenticator
}
