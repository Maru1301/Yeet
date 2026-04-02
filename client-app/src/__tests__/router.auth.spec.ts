import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// --- Mocks (declared before any imports of the module under test) ---

const mockGetAuth = vi.fn();
const mockUpdateNtAccount = vi.fn();
const mockUpdateAIToken = vi.fn();
const mockGetUserAuth = vi.fn();

vi.mock('../store/index', () => ({
  useAppStore: () => ({
    getAuth: mockGetAuth,
    updateNtAccount: mockUpdateNtAccount,
    updateAIToken: mockUpdateAIToken,
    getUserAuth: mockGetUserAuth,
    ntAccount: 'DOMAIN\\user1',
  }),
}));

const { mockTokenRequest } = vi.hoisted(() => ({
  mockTokenRequest: vi.fn().mockResolvedValue({ data: { token: 'test-token' } }),
}));
vi.mock('../global/gpt.api.service', () => ({
  gptService: {
    token: {
      path: () => '/auth/token',
      request: mockTokenRequest,
    },
  },
}));

const { mockGetCookieAD, mockKingSSOAuth } = vi.hoisted(() => ({
  mockGetCookieAD: vi.fn(),
  mockKingSSOAuth: vi.fn(),
}));
vi.mock('../plugins/kingSSO', () => ({
  default: {
    getCookieAD: mockGetCookieAD,
    auth: mockKingSSOAuth,
  },
}));

vi.mock('./index', () => ({
  default: { push: vi.fn() },
}));

// --- Import module under test after mocks ---
import { hasAuth, initAIAuth } from '../router/auth';

describe('hasAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('returns true when route has no auth rule (e.g. browser_not_support)', () => {
    expect(hasAuth({ name: 'browser_not_support', params: {} })).toBe(true);
  });

  it('returns true when route has no auth rule (e.g. no_auth)', () => {
    expect(hasAuth({ name: 'no_auth', params: {} })).toBe(true);
  });

  it('calls store.getAuth with all permissions when no department param', () => {
    mockGetAuth.mockReturnValue(true);
    const result = hasAuth({ name: 'home', params: {} });
    expect(mockGetAuth).toHaveBeenCalledWith([
      'MIS', 'MIS NW', 'IIS', 'BMO', 'POC', 'Planner',
      'DesignEngineering', 'HR', 'CNFin', 'TestEngineering',
      'SMT', 'Purchasing', 'Finance',
    ]);
    expect(result).toBe(true);
  });

  it('returns false when store.getAuth returns false for home route', () => {
    mockGetAuth.mockReturnValue(false);
    expect(hasAuth({ name: 'home', params: {} })).toBe(false);
  });

  it('returns false when department is not in the rule permissions list', () => {
    const result = hasAuth({ name: 'chat_department', params: { department: 'Unknown' } });
    expect(result).toBe(false);
  });

  it('calls store.getAuth with the department when department is in permissions', () => {
    mockGetAuth.mockReturnValue(true);
    const result = hasAuth({ name: 'chat_department', params: { department: 'MIS' } });
    expect(mockGetAuth).toHaveBeenCalledWith(['MIS']);
    expect(result).toBe(true);
  });

  it('returns false when store.getAuth returns false for department route', () => {
    mockGetAuth.mockReturnValue(false);
    const result = hasAuth({ name: 'record_department', params: { department: 'MIS' } });
    expect(mockGetAuth).toHaveBeenCalledWith(['MIS']);
    expect(result).toBe(false);
  });

  it('is case-insensitive for department matching', () => {
    mockGetAuth.mockReturnValue(true);
    expect(hasAuth({ name: 'chat_department', params: { department: 'mis' } })).toBe(true);
    expect(hasAuth({ name: 'chat_department', params: { department: 'MIS NW' } })).toBe(true);
  });
});

describe('initAIAuth', () => {
  it('calls gptService.token.request and commits the token to the store', async () => {
    await initAIAuth();
    expect(mockTokenRequest).toHaveBeenCalled();
    expect(mockUpdateAIToken).toHaveBeenCalledWith('test-token');
  });
});
