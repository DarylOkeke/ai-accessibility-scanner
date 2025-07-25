import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider {...pageProps}>
      {/* Temporarily disabled authentication for debugging */}
      <Component {...pageProps} />
      
      {/* Enable this when you want authentication:
      <SignedIn>
        <Component {...pageProps} />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      */}
    </ClerkProvider>
  )
}
