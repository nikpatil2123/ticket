import { IsMongoId, IsOptional } from 'class-validator';

export class AdminUpdateUserDto {
  @IsMongoId()
  @IsOptional()
  roleId?: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;

  @IsMongoId()
  @IsOptional()
  teamId?: string;
}
