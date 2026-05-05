import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}
