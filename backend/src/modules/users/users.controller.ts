import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    (user as any).passwordHash = undefined;
    return { data: user };
  }

  @Get()
  async getAllUsers() {
    const users = await this.usersService.getAllUsers();
    return { data: users, meta: { total: users.length } };
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);
    return { data: user };
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    const user = await this.usersService.updateUser(id, body);
    (user as any).passwordHash = undefined;
    return { data: user };
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return { success: true, message: 'User deleted successfully' };
  }
}
