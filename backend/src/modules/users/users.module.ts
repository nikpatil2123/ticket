import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { User, UserSchema } from './schemas/user.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { Team, TeamSchema } from './schemas/team.schema';
import { SubDepartment, SubDepartmentSchema } from './schemas/sub-department.schema';

import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { DepartmentsRepository } from './departments.repository';

import { SubDepartmentsController } from './sub-departments.controller';
import { SubDepartmentsService } from './sub-departments.service';
import { SubDepartmentsRepository } from './sub-departments.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Team.name, schema: TeamSchema },
      { name: SubDepartment.name, schema: SubDepartmentSchema },
    ]),
  ],
  controllers: [UsersController, DepartmentsController, SubDepartmentsController],
  providers: [
    UsersService,
    UsersRepository,
    DepartmentsService,
    DepartmentsRepository,
    SubDepartmentsService,
    SubDepartmentsRepository,
  ],
  exports: [UsersService, DepartmentsService, SubDepartmentsService],
})
export class UsersModule {}
