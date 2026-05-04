import { SupabaseAuthGuard } from './supabase-auth.guard';

describe('SupabaseAuthGuard', () => {
  it('should be defined', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
    };

    expect(new SupabaseAuthGuard(configService as never)).toBeDefined();
  });
});
