import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsMongoId()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsMongoId()
  departmentId: string;

  @IsMongoId()
  @IsOptional()
  teamId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
