import { Controller, Get, Param, Put, Body, Post, Req, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { GoogleAuthService } from '../auth/google-auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly googleAuthService: GoogleAuthService
  ) {}

  @Get()
  async getAllTickets(@Req() req: any) {
    const departmentId = req.user.role === 'ADMIN' ? undefined : req.user.departmentId;
    const tickets = await this.ticketsService.getAllTickets(departmentId);
    return { data: tickets };
  }

  @Get('track/:ticketNumber')
  async trackTicket(@Param('ticketNumber') ticketNumber: string) {
    const ticket = await this.ticketsService.getTicketByNumber(ticketNumber);
    const timeline = await this.ticketsService.getTimeline((ticket as any)._id.toString());
    return { data: { ticket, timeline } };
  }

  @Get(':id')
  async getTicket(@Param('id') id: string) {
    const ticket = await this.ticketsService.getTicket(id);
    return { data: ticket };
  }

  @Get(':id/timeline')
  async getTicketTimeline(@Param('id') id: string) {
    const timeline = await this.ticketsService.getTimeline(id);
    return { data: timeline };
  }

  @Put(':id/status')
  async updateTicketStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateTicketStatusDto,
    @Req() req: any
  ) {
    const actorId = req.user._id?.toString() || req.user.sub?.toString();
    const ticket = await this.ticketsService.updateStatus(id, updateDto, actorId, this.googleAuthService);
    return { data: ticket };
  }

  @Post(':id/messages')
  async sendReply(
    @Param('id') id: string,
    @Body('bodyText') bodyText: string,
    @Req() req: any
  ) {
    const actorId = req.user._id?.toString() || req.user.sub?.toString();
    const result = await this.ticketsService.sendReply(id, bodyText, actorId, this.googleAuthService);
    return { data: result };
  }
}
