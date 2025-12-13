import { SupabaseAuthGuard } from './supabase-auth.guard';

describe('SupabaseAuthGuard', () => {
  it('should be defined', () => {
    expect(new SupabaseAuthGuard()).toBeDefined();
  });
});
