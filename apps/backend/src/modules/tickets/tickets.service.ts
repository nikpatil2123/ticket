import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TicketsRepository } from './tickets.repository';
import { Ticket, TicketStatus } from './schemas/ticket.schema';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly ticketsRepository: TicketsRepository) {}

  async getAllTickets(departmentId?: string): Promise<Ticket[]> {
    return this.ticketsRepository.findAll(departmentId);
  }

  async getTicket(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findTicketById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async getTicketByNumber(ticketNumber: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findByTicketNumber(ticketNumber);
    if (!ticket) {
      throw new NotFoundException(`Ticket with number ${ticketNumber} not found`);
    }
    return ticket;
  }

  async findTicketByThreadId(threadId: string): Promise<Ticket | null> {
    return this.ticketsRepository.findTicketByThreadId(threadId);
  }

  async addMessage(ticketId: string, direction: string, from: string, to: string[], subject: string, bodyText: string) {
    return this.ticketsRepository.addMessage(ticketId, direction, from, to, subject, bodyText);
  }

  async logActivity(ticketId: string, actorId: string | null, action: string, changes?: any, note?: string) {
    return this.ticketsRepository.logActivity(ticketId, actorId, action, changes, note);
  }

  async updateStatus(id: string, updateDto: UpdateTicketStatusDto, actorId: string, googleAuthService?: any): Promise<Ticket> {
    const ticket = await this.getTicket(id);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Cannot update status of a CLOSED ticket');
    }

    const resolvedAt = updateDto.status === TicketStatus.RESOLVED ? new Date() : null;
    
    const updatedTicket = await this.ticketsRepository.updateTicketStatus(id, updateDto.status, resolvedAt || undefined);
    
    await this.ticketsRepository.logActivity(id, actorId, 'STATUS_CHANGED', {
      oldStatus: ticket.status,
      newStatus: updateDto.status
    }, updateDto.resolutionNote);

    // If closing, send an email to the user as a reply thread
    if (updateDto.status === TicketStatus.CLOSED && googleAuthService) {
      const bodyText = `Hello,\n\nYour support ticket ${ticket.ticketNumber} has been marked as CLOSED.\n\nResolution Note: ${updateDto.resolutionNote || 'Resolved by agent'}\n\nBest regards,\nParul University Support`;
      try {
        await this.ticketsRepository.addMessage(
          id,
          'OUTBOUND',
          'support@acme.com',
          [ticket.customerEmail],
          `Re: ${ticket.subject}`,
          bodyText
        );
        await this.sendEmailDirectly(ticket, 'Re:', bodyText, googleAuthService);
        await this.ticketsRepository.logActivity(id, actorId, 'SYSTEM_REPLY', {}, 'Automated closure email sent');
      } catch(e) {
        console.error('Failed to send closure email', e);
      }
    }

    if (!updatedTicket) throw new NotFoundException('Failed to update ticket');
    return updatedTicket;
  }

  // Helper function to send email reliably, maintaining threads
  private async sendEmailDirectly(ticket: any, subjectPrefix: string, bodyText: string, googleAuthService: any) {
    const auth = await googleAuthService.getAuthClient();
    const { google } = require('googleapis');
    const gmail = google.gmail({ version: 'v1', auth });

    // Fetch the authenticated user's email address
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const fromEmail = profile.data.emailAddress;

    const emailLines = [
      `From: ${fromEmail}`,
      `To: ${ticket.customerEmail}`,
      'Content-type: text/plain;charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subjectPrefix} ${ticket.subject}`
    ];

    if (ticket.messageId) {
      emailLines.push(`In-Reply-To: ${ticket.messageId}`);
      emailLines.push(`References: ${ticket.messageId}`);
    }

    emailLines.push('');
    emailLines.push(bodyText);
    
    const emailStr = emailLines.join('\n');
    const encodedEmail = Buffer.from(emailStr).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const requestBody: any = { raw: encodedEmail };
    if (ticket.threadId) {
      requestBody.threadId = ticket.threadId;
    }

    await gmail.users.messages.send({
      userId: 'me',
      requestBody
    });
  }

  async getTimeline(id: string) {
    const ticket = await this.getTicket(id); // ensure exists
    const { messages, logs } = await this.ticketsRepository.getTimeline((ticket as any).id || (ticket as any)._id);
    
    // Merge and sort chronologically
    const timeline = [
      ...messages.map(m => ({ type: 'MESSAGE', data: m, timestamp: m.receivedAt })),
      ...logs.map(l => ({ type: 'ACTIVITY', data: l, timestamp: (l as any).createdAt }))
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return timeline;
  }

  async createTicket(payload: any) {
    return this.ticketsRepository.createTicket(
      { 
        subject: payload.subject, 
        customerEmail: payload.customerEmail, 
        aiClassification: payload.aiClassification,
        threadId: payload.threadId,
        messageId: payload.messageId
      }, 
      payload.initialMessage
    );
  }

  async sendReply(id: string, bodyText: string, actorId: string, googleAuthService: any) {
    const ticket = await this.getTicket(id);
    
    // Save outbound message to DB
    await this.ticketsRepository.addMessage(
      id,
      'OUTBOUND',
      'support@acme.com', // Would normally be dynamically fetched from SystemSettings
      [ticket.customerEmail],
      `Re: ${ticket.subject}`,
      bodyText
    );
    await this.ticketsRepository.logActivity(id, actorId, 'AGENT_REPLY', {}, 'Agent sent a reply');

    // Actually send the email via Gmail API
    try {
      await this.sendEmailDirectly(ticket, 'Re:', bodyText, googleAuthService);
    } catch(e) {
      console.error('Failed to send reply email', e);
    }

    return { success: true };
  }

  async sendAutoReply(id: string, googleAuthService: any) {
    const ticket = await this.getTicket(id);
    const bodyText = `Hello,\n\nWe have received your support request. Your ticket number is ${ticket.ticketNumber}.\n\nOur team will get back to you shortly.\n\nBest regards,\nParul University Support`;
    
    // Save outbound message to DB
    await this.ticketsRepository.addMessage(
      id,
      'OUTBOUND',
      'support@acme.com',
      [ticket.customerEmail],
      `Re: ${ticket.subject}`,
      bodyText
    );
    await this.ticketsRepository.logActivity(id, null, 'SYSTEM_REPLY', {}, 'Automated ticket confirmation sent');

    // Actually send the email via Gmail API
    try {
      await this.sendEmailDirectly(ticket, 'Re:', bodyText, googleAuthService);
    } catch(e) {
      console.error('Failed to send auto reply email', e);
    }

    return { success: true };
  }
}
