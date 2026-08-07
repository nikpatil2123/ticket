import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    let roleId = createUserDto.roleId;
    if (!roleId && (createUserDto as any).role) {
      const role = await this.usersRepository.findRoleByName(
        (createUserDto as any).role,
      );
      if (role) {
        roleId = (role as any)._id.toString();
      }
    }

    const salt = await bcrypt.genSalt(12);
    const passwordToHash = (createUserDto as any).password || 'password123';
    const passwordHash = await bcrypt.hash(passwordToHash, salt);

    return this.usersRepository.create({
      ...createUserDto,
      roleId,
      passwordHash,
    } as any);
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUser(id: string, updateDto: any): Promise<User> {
    if (updateDto.password) {
      const salt = await bcrypt.genSalt(12);
      updateDto.passwordHash = await bcrypt.hash(updateDto.password, salt);
      delete updateDto.password;
    }
    const updated = await this.usersRepository.update(id, updateDto);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async findByEmail(email: string): Promise<any> {
    return this.usersRepository.findByEmail(email);
  }
}
