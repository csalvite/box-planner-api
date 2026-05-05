import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtAuthUser } from '../auth/auth.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { StudentService } from './student.service';

@ApiTags('student')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('next-session')
  @ApiOperation({ summary: 'Obtener la prÃ³xima clase del alumno' })
  getNextSession(@AuthUser() user: JwtAuthUser) {
    return this.studentService.getNextSession(user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadÃ­sticas del alumno' })
  getStats(@AuthUser() user: JwtAuthUser) {
    return this.studentService.getStats(user.id);
  }
}
