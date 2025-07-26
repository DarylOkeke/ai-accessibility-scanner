// Import jest-dom custom matchers
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.UPSTASH_REDIS_URL = 'rediss://test:test@localhost:6379'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.SENDGRID_API_KEY = 'test-sendgrid-key'

// Mock fetch globally for all tests
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const { src, alt, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return `<img src="${src}" alt="${alt}" ${Object.keys(rest).map(key => `${key}="${rest[key]}"`).join(' ')} />`;
  },
}))
