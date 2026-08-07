import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private sanitizeUser(user: any) {
    const obj = user.toObject ? user.toObject() : user;
    delete obj.passwordHash;
    return obj;
  }

  @Post()
  @Roles('ADMIN')
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return { data: this.sanitizeUser(user) };
  }

  @Get()
  @Roles('ADMIN')
  async getAllUsers() {
    const users = await this.usersService.getAllUsers();
    return { data: users.map(u => this.sanitizeUser(u)), meta: { total: users.length } };
  }

  @Get(':id')
  @Roles('ADMIN')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);
    return { data: this.sanitizeUser(user) };
  }

  @Put(':id')
  @Roles('ADMIN')
  async updateUser(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const user = req.user;

    if (body.roleId) {
      const isAdmin = user?.role === 'ADMIN' || user?.roleId?.name === 'ADMIN';
      if (!isAdmin) {
        throw new ForbiddenException('Only admins can change user roles');
      }
    }

    const allowedFields: any = {};
    if (body.firstName) allowedFields.firstName = body.firstName;
    if (body.lastName) allowedFields.lastName = body.lastName;
    if (body.email) allowedFields.email = body.email;
    if (body.departmentId) allowedFields.departmentId = body.departmentId;
    if (body.teamId) allowedFields.teamId = body.teamId;
    if (body.isActive !== undefined) allowedFields.isActive = body.isActive;
    if (body.password) allowedFields.password = body.password;

    const isAdmin = user?.role === 'ADMIN' || user?.roleId?.name === 'ADMIN';
    if (isAdmin && body.roleId) {
      allowedFields.roleId = body.roleId;
    }

    const updatedUser = await this.usersService.updateUser(id, allowedFields);
    return { data: this.sanitizeUser(updatedUser) };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return { success: true, message: 'User deleted successfully' };
  }
}
