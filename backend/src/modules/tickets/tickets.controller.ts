import {
  Controller,
  Get,
  Param,
  Put,
  Body,
  Post,
  Req,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { GoogleAuthService } from '../auth/google-auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeedbackService } from '../feedback/feedback.service';

@Controller('v1/tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly feedbackService: FeedbackService,
  ) {}

  @Get()
  async getAllTickets(@Req() req: any) {
    const isAdmin = req.user.role === 'ADMIN' || req.user.roleId?.name === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.roleId?.name === 'SUPER_ADMIN'; console.log('isAdmin:', isAdmin, 'roleId:', req.user.roleId);
    const departmentId = isAdmin ? req.query.departmentId : req.user.departmentId;
    const tatType = req.query.tatType;
    const priority = req.query.priority;
    const status = req.query.status;
    const search = req.query.search;
    const subDepartmentId = req.query.subDepartmentId;
    const tickets = await this.ticketsService.getAllTickets(
      departmentId,
      tatType,
      priority,
      status,
      search,
      subDepartmentId,
    );
    return { data: tickets };
  }

  @Get('stats')
  async getTicketStats(@Req() req: any) {
    const isAdmin = req.user.role === 'ADMIN' || req.user.roleId?.name === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.roleId?.name === 'SUPER_ADMIN'; console.log('isAdmin:', isAdmin, 'roleId:', req.user.roleId);
    const departmentId = isAdmin ? req.query.departmentId : req.user.departmentId;
    const { startDate, endDate } = req.query;
    const stats = await this.ticketsService.getTicketStats(departmentId, startDate, endDate);
    return { data: stats };
  }

  @Get('agent-stats')
  async getAgentStats(@Req() req: any) {
    if (req.user.role !== 'ADMIN' && req.user.roleId?.name !== 'ADMIN') {
      throw new Error(`Unauthorized: Only Admins can view agent stats.`);
    }
    const { startDate, endDate } = req.query;
    const stats = await this.ticketsService.getAgentStats(startDate, endDate);
    return { data: stats };
  }

  @Get('agent-stats/:agentId')
  async getAgentDetailedStats(
    @Req() req: any,
    @Param('agentId') agentId: string,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.roleId?.name !== 'ADMIN') {
      throw new Error(
        `Unauthorized: Only Admins can view agent detailed stats.`,
      );
    }
    const { startDate, endDate } = req.query;
    const stats = await this.ticketsService.getAgentDetailedStats(agentId, startDate, endDate);
    return { data: stats };
  }

  @Get('track/:ticketNumber')
  async trackTicket(@Param('ticketNumber') ticketNumber: string) {
    const ticket = await this.ticketsService.getTicketByNumber(ticketNumber);
    const timeline = await this.ticketsService.getTimeline(
      (ticket as any)._id.toString(),
    );
    const feedback = await this.feedbackService.getFeedbackForTicket((ticket as any)._id.toString());
    return { data: { ticket, timeline, feedback } };
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
    @Req() req: any,
  ) {
    const actorId = req.user._id?.toString() || req.user.sub?.toString();
    const ticket = await this.ticketsService.updateStatus(
      id,
      updateDto,
      actorId,
      this.googleAuthService,
      req.user,
    );
    return { data: ticket };
  }

  @Put(':id/request-count')
  async updateTicketRequestCount(
    @Param('id') id: string,
    @Body('requestCount') requestCount: number,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    try {
      const isAdmin =
        req.user.role === 'ADMIN' || req.user.roleId?.name === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.roleId?.name === 'SUPER_ADMIN';
      if (!isAdmin) {
        throw new Error(`Unauthorized: Only Admins can update request count.`);
      }
      const actorId = req.user._id?.toString() || req.user.sub?.toString();
      const ticket = await this.ticketsService.updateRequestCount(
        id,
        requestCount,
        reason,
        actorId,
      );
      return { data: ticket };
    } catch (e: any) {
      console.error('Failed to update request count:', e);
      throw new HttpException(
        e.message || 'Internal server error',
        e.status || 500,
      );
    }
  }

  @Put(':id/flag')
  async updateTicketFlag(
    @Param('id') id: string,
    @Body('isFlagged') isFlagged: boolean,
    @Req() req: any,
  ) {
    try {
      const actorId = req.user._id?.toString() || req.user.sub?.toString();
      const ticket = await this.ticketsService.updateFlag(
        id,
        isFlagged,
        actorId,
      );
      return { data: ticket };
    } catch (e: any) {
      console.error('Failed to update flag:', e);
      throw new HttpException(
        e.message || 'Internal server error',
        e.status || 500,
      );
    }
  }

  @Put(':id/priority')
  async updateTicketPriority(
    @Param('id') id: string,
    @Body('priority') priority: any,
    @Req() req: any,
  ) {
    try {
      const isAdmin =
        req.user.role === 'ADMIN' || req.user.roleId?.name === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.roleId?.name === 'SUPER_ADMIN';
      if (!isAdmin) {
        throw new Error(`Unauthorized: Only Admins can update priority.`);
      }
      const actorId = req.user._id?.toString() || req.user.sub?.toString();
      const ticket = await this.ticketsService.updatePriority(
        id,
        priority,
        actorId,
      );
      return { data: ticket };
    } catch (e: any) {
      console.error('Failed to update priority:', e);
      throw new HttpException(
        e.message || 'Internal server error',
        e.status || 500,
      );
    }
  }

  @Put(':id/department')
  async updateTicketDepartment(
    @Param('id') id: string,
    @Body('departmentId') departmentId: string,
    @Req() req: any,
  ) {
    try {
      const isAdmin =
        req.user.role === 'ADMIN' || req.user.roleId?.name === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.roleId?.name === 'SUPER_ADMIN';
      if (!isAdmin) {
        throw new Error(
          `Unauthorized: Only Admins can reassign departments. role: ${req.user.role}, roleId: ${JSON.stringify(req.user.roleId)}`,
        );
      }
      const actorId = req.user._id?.toString() || req.user.sub?.toString();
      const ticket = await this.ticketsService.updateDepartment(
        id,
        departmentId,
        actorId,
      );
      return { data: ticket };
    } catch (e: any) {
      console.error('Failed to update department:', e);
      throw new HttpException(
        e.message || 'Internal server error',
        e.status || 500,
      );
    }
  }

  @Put(':id/sub-department')
  async updateTicketSubDepartment(
    @Param('id') id: string,
    @Body('subDepartmentId') subDepartmentId: string,
    @Req() req: any,
  ) {
    try {
      const isAdmin =
        req.user.role === 'ADMIN' || req.user.roleId?.name === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.roleId?.name === 'SUPER_ADMIN';
      if (!isAdmin) {
        throw new Error(`Unauthorized: Only Admins can reassign sub-departments.`);
      }
      const actorId = req.user._id?.toString() || req.user.sub?.toString();
      const ticket = await this.ticketsService.updateSubDepartment(
        id,
        subDepartmentId,
        actorId,
      );
      return { data: ticket };
    } catch (e: any) {
      console.error('Failed to update sub-department:', e);
      throw new HttpException(
        e.message || 'Internal server error',
        e.status || 500,
      );
    }
  }

  @Put(':id/tatType')
  async updateTicketTatType(
    @Param('id') id: string,
    @Body('tatType') tatType: 'INTERNAL' | 'EXTERNAL',
    @Req() req: any,
  ) {
    try {
      const isAdmin =
        req.user.role === 'ADMIN' || req.user.roleId?.name === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.roleId?.name === 'SUPER_ADMIN';
      if (!isAdmin) {
        throw new Error(`Unauthorized: Only Admins can reassign TAT type.`);
      }
      const actorId = req.user._id?.toString() || req.user.sub?.toString();
      const ticket = await this.ticketsService.updateTatType(
        id,
        tatType,
        actorId,
      );
      return { data: ticket };
    } catch (e: any) {
      console.error('Failed to update TAT type:', e);
      throw new HttpException(
        e.message || 'Internal server error',
        e.status || 500,
      );
    }
  }

  @Post(':id/messages')
  async sendReply(
    @Param('id') id: string,
    @Body('bodyText') bodyText: string,
    @Body('cc') cc: string[],
    @Body('to') to: string[],
    @Req() req: any,
  ) {
    const actorId = req.user._id?.toString() || req.user.sub?.toString();
    const result = await this.ticketsService.sendReply(
      id,
      bodyText,
      actorId,
      this.googleAuthService,
      cc,
      to,
    );
    return { data: result };
  }
}
