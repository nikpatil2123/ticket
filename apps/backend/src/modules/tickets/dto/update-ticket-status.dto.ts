import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '../schemas/ticket.schema';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @IsString()
  @IsOptional()
  resolutionNote?: string;
}
