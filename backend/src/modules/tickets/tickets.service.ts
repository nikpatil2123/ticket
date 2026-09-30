import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TicketsRepository } from './tickets.repository';
import { Ticket, TicketStatus, TicketPriority } from './schemas/ticket.schema';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { SettingsService } from '../settings/settings.service';
import { FeedbackService } from '../feedback/feedback.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly settingsService: SettingsService,
    private readonly feedbackService: FeedbackService,
  ) {}

  async getAllTickets(
    departmentId?: string,
    tatType?: string,
    priority?: string,
    status?: string,
    search?: string,
    subDepartmentId?: string,
  ): Promise<Ticket[]> {
    return this.ticketsRepository.findAll(
      departmentId,
      tatType,
      priority,
      status,
      search,
      subDepartmentId,
    );
  }

  async getTicketStats(departmentId?: string, startDate?: string, endDate?: string): Promise<any> {
    const [rawStats, topSenders, departmentStats, subDepartmentStats] = await Promise.all([
      this.ticketsRepository.getTicketStats(departmentId, startDate, endDate),
      this.ticketsRepository.getTopSenders(departmentId, startDate, endDate),
      this.ticketsRepository.getDepartmentStats(startDate, endDate),
      this.ticketsRepository.getSubDepartmentStats(departmentId, startDate, endDate),
    ]);

    // Format the stats into a friendly object
    const stats: Record<string, number> = {
      TOTAL: 0,
      TOTAL_REQUESTS: 0,
      IN_PROGRESS_REQUESTS: 0,
      RESOLVED_REQUESTS: 0,
      CLOSED_REQUESTS: 0,
      NEW: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      PENDING_CUSTOMER: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    rawStats.forEach((stat) => {
      if (stats[stat._id as string] !== undefined) {
        stats[stat._id as string] = stat.count;
      }
      stats.TOTAL += stat.count;
      const reqCount = stat.requestCountSum || stat.count;
      stats.TOTAL_REQUESTS += reqCount;
      
      // Breakdown requests by specific status
      if (stat._id === 'IN_PROGRESS' || stat._id === 'OPEN') {
        stats.IN_PROGRESS_REQUESTS += reqCount;
      } else if (stat._id === 'RESOLVED') {
        stats.RESOLVED_REQUESTS += reqCount;
      } else if (stat._id === 'CLOSED') {
        stats.CLOSED_REQUESTS += reqCount;
      }
    });

    return {
      stats,
      topSenders,
      departmentStats,
      subDepartmentStats,
    };
  }

  async getAgentStats(startDate?: string, endDate?: string): Promise<any[]> {
    const internalTat = await this.settingsService.getSetting('tat_internal');
    const externalTat = await this.settingsService.getSetting('tat_external');
    
    // Default to 24 hrs for internal, 48 hrs for external if not set
    const internalHours = internalTat?.resolutionHours || 24;
    const externalHours = externalTat?.resolutionHours || 48;

    return this.ticketsRepository.getAgentStats(startDate, endDate, internalHours * 3600000, externalHours * 3600000);
  }

  async getAgentDetailedStats(agentId: string, startDate?: string, endDate?: string): Promise<any> {
    const internalTat = await this.settingsService.getSetting('tat_internal');
    const externalTat = await this.settingsService.getSetting('tat_external');
    
    const internalHours = internalTat?.resolutionHours || 24;
    const externalHours = externalTat?.resolutionHours || 48;

    const stats = await this.ticketsRepository.getAgentDetailedStats(agentId, startDate, endDate, internalHours * 3600000, externalHours * 3600000);
    if (!stats) {
      throw new NotFoundException('Agent not found or no stats available');
    }
    return stats;
  }

  async getTicket(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findTicketById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async getTicketByNumber(ticketNumber: string): Promise<Ticket> {
    const ticket =
      await this.ticketsRepository.findByTicketNumber(ticketNumber);
    if (!ticket) {
      throw new NotFoundException(
        `Ticket with number ${ticketNumber} not found`,
      );
    }
    return ticket;
  }

  async findTicketByThreadId(threadId: string): Promise<Ticket | null> {
    return this.ticketsRepository.findTicketByThreadId(threadId);
  }

  async findTicketByGmailThreadId(connectionId: string, threadId: string): Promise<Ticket | null> {
    return this.ticketsRepository.findTicketByGmailThreadId(connectionId, threadId);
  }

  async findMessageByMessageId(messageId: string) {
    return this.ticketsRepository.findMessageByMessageId(messageId);
  }

  async findMessageByGmailId(connectionId: string, gmailMessageId: string) {
    return this.ticketsRepository.findMessageByGmailId(connectionId, gmailMessageId);
  }

  async findTicketByMessageIdHeader(messageId: string) {
    return this.ticketsRepository.findTicketByMessageIdHeader(messageId);
  }

  async addMessage(
    ticketId: string,
    direction: string,
    from: string,
    to: string[],
    subject: string,
    bodyText: string,
    messageId?: string,
    metadata?: any, // { gmailConnectionId, gmailMessageId, gmailThreadId, messageId (header), inReplyTo, references }
  ) {
    return this.ticketsRepository.addMessage(
      ticketId,
      direction,
      from,
      to,
      subject,
      bodyText,
      messageId,
      metadata,
    );
  }

  async logActivity(
    ticketId: string,
    actorId: string | null,
    action: string,
    changes?: any,
    note?: string,
  ) {
    return this.ticketsRepository.logActivity(
      ticketId,
      actorId,
      action,
      changes,
      note,
    );
  }

  async updateStatus(
    id: string,
    updateDto: UpdateTicketStatusDto,
    actorId: string,
    googleAuthService?: any,
    user?: any,
  ): Promise<Ticket> {
    const ticket = await this.getTicket(id);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Cannot update status of a CLOSED ticket');
    }

    const resolvedAt =
      updateDto.status === TicketStatus.RESOLVED ? new Date() : null;

    // Auto-assign to the actor if it's being closed/resolved and isn't currently assigned
    let finalAssignedTo = undefined;
    if (
      (updateDto.status === TicketStatus.CLOSED ||
        updateDto.status === TicketStatus.RESOLVED) &&
      !ticket.assignedTo &&
      actorId
    ) {
      finalAssignedTo = actorId;
    }

    // SLA Pausing Logic
    const extraFields: any = {};
    const pausedStatuses = [
      TicketStatus.PENDING_APPROVAL,
      TicketStatus.PENDING_DOCUMENT_CLARIFICATION,
      TicketStatus.PENDING_CUSTOMER,
    ];
    const isNowPaused = pausedStatuses.includes(updateDto.status);
    const wasPaused = pausedStatuses.includes(ticket.status);

    if (isNowPaused && !wasPaused) {
      extraFields.pausedAt = new Date();
      extraFields.tatType = 'EXTERNAL';
    } else if (!isNowPaused && wasPaused && ticket.pausedAt) {
      const elapsedMs =
        new Date().getTime() - new Date(ticket.pausedAt).getTime();
      extraFields.totalPausedTimeMs =
        (ticket.totalPausedTimeMs || 0) + elapsedMs;
      extraFields.pausedAt = null;
    }

    if (
      (updateDto.status === TicketStatus.IN_PROGRESS ||
        updateDto.status === TicketStatus.RESOLVED ||
        updateDto.status === TicketStatus.CLOSED) &&
      !ticket.inProgressAt
    ) {
      extraFields.inProgressAt = new Date();
    }

    const updatedTicket = await this.ticketsRepository.updateTicketStatus(
      id,
      updateDto.status,
      resolvedAt || undefined,
      finalAssignedTo,
      extraFields,
    );

    // Check if department is Miscellaneous to skip automated emails/messages
    const isMiscellaneous = (ticket.departmentId as any)?.name?.toLowerCase() === 'miscellaneous';

    if (updateDto.status === TicketStatus.CLOSED && user && !isMiscellaneous) {
      const agentName =
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Agent';
      await this.ticketsRepository.addMessage(
        id,
        'INTERNAL',
        'SYSTEM',
        [],
        'Ticket Closed',
        `Closed by the agent ${agentName}`,
      );
    }

    await this.ticketsRepository.logActivity(
      id,
      actorId,
      'STATUS_CHANGED',
      {
        oldStatus: ticket.status,
        newStatus: updateDto.status,
      },
      updateDto.resolutionNote,
    );

    // If closing, send the specific closure email to the user as a reply thread
    if (updateDto.status === TicketStatus.CLOSED && googleAuthService && !isMiscellaneous) {
      const bodyText = `Hello,\n\nYour support ticket ${ticket.ticketNumber} has been marked as CLOSED.\n\nResolution Note: ${updateDto.resolutionNote || 'Resolved by agent'}\n\n**DO NOT REPLY TO THIS MAIL YOUR TICKET IS MARKED CLOSED**\n\nBest regards,\nParul University Support`;
      try {
        await this.ticketsRepository.addMessage(
          id,
          'OUTBOUND',
          'support@acme.com',
          [ticket.customerEmail],
          `Re: ${ticket.subject}`,
          bodyText,
        );
        await this.sendEmailDirectly(
          ticket,
          'Re:',
          bodyText,
          googleAuthService,
        );
        await this.ticketsRepository.logActivity(
          id,
          actorId,
          'SYSTEM_REPLY',
          {},
          'Automated closure email sent',
        );
      } catch (err) {
        this.logger.error('Failed to send automated closure email', err);
      }
    } else if (updateDto.status === TicketStatus.RESOLVED && googleAuthService && !isMiscellaneous) {
      // Generate Feedback Token and send review link
      try {
        const token = await this.feedbackService.generateToken(id, ticket.customerEmail); // Using customer email as user identifier for now
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const reviewLink = `${frontendUrl}/feedback?token=${token}`;

        const bodyText = `Hello,\n\nYour support ticket ${ticket.ticketNumber} has been marked as RESOLVED.\n\nWe would love to hear your feedback! Please take a moment to rate your experience using the link below (valid for 24 hours):\n\n${reviewLink}\n\nResolution Note: ${updateDto.resolutionNote || 'Resolved by agent'}\n\nBest regards,\nParul University Support`;
        
        // Directly send email without adding it to the ticket's message timeline
        await this.sendEmailDirectly(
          ticket,
          'Re:',
          bodyText,
          googleAuthService,
        );
        await this.ticketsRepository.logActivity(
          id,
          actorId,
          'SYSTEM_REPLY',
          {},
          'Automated resolution email with feedback link sent',
        );
      } catch (err) {
        this.logger.error('Failed to send feedback link email', err);
      }
    } else if (
      updateDto.status !== ticket.status &&
      updateDto.status === TicketStatus.IN_PROGRESS &&
      googleAuthService &&
      !isMiscellaneous
    ) {
      // Send the ticket number and status when it moves to In Progress
      const bodyText = `Hello,\n\nWe have received your support request. Your ticket number is ${ticket.ticketNumber} and its status is now: In Progress.\n\nOur team is working on it.\n\nBest regards,\nParul University Support`;
      try {
        await this.ticketsRepository.addMessage(
          id,
          'OUTBOUND',
          'support@acme.com',
          [ticket.customerEmail],
          `Re: ${ticket.subject}`,
          bodyText,
        );
        await this.sendEmailDirectly(
          ticket,
          'Re:',
          bodyText,
          googleAuthService,
        );
        await this.ticketsRepository.logActivity(
          id,
          actorId,
          'SYSTEM_REPLY',
          {},
          `Automated status update email sent (In Progress)`,
        );
      } catch (err) {
        this.logger.error('Failed to send automated status email', err);
      }
    }

    if (!updatedTicket) throw new NotFoundException('Failed to update ticket');
    return updatedTicket;
  }

  async updateRequestCount(
    id: string,
    requestCount: number,
    reason: string,
    actorId: string,
  ): Promise<Ticket> {
    if (requestCount < 1) {
      throw new BadRequestException('requestCount must be at least 1');
    }
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Reason is mandatory for updating request count');
    }

    const ticket = await this.getTicket(id);
    const oldRequestCount = ticket.requestCount || 1;

    const updatedTicket = await this.ticketsRepository.updateRequestCount(
      id,
      requestCount,
    );

    if (!updatedTicket) throw new NotFoundException('Failed to update ticket');

    await this.ticketsRepository.logActivity(
      id,
      actorId,
      'REQUEST_COUNT_UPDATED',
      {
        oldRequestCount,
        newRequestCount: requestCount,
        difference: requestCount - oldRequestCount,
        reason,
      },
      reason,
    );

    return updatedTicket;
  }

  async updatePriority(
    id: string,
    priority: TicketPriority,
    actorId: string,
  ): Promise<Ticket> {
    const ticket = await this.getTicket(id);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Cannot update priority of a CLOSED ticket');
    }

    const updatedTicket = await this.ticketsRepository.updateTicketPriority(
      id,
      priority,
    );

    if (!updatedTicket) throw new NotFoundException('Failed to update ticket');

    await this.ticketsRepository.logActivity(
      id,
      actorId,
      'PRIORITY_UPDATED',
      {
        oldPriority: ticket.priority || TicketPriority.P3,
        newPriority: priority,
      },
      `Admin manually updated priority to ${priority}`,
    );

    return updatedTicket;
  }

  async updateFlag(
    id: string,
    isFlagged: boolean,
    actorId: string,
  ): Promise<Ticket> {
    const ticket = await this.getTicket(id);

    const updatedTicket = await this.ticketsRepository.updateTicketFlag(
      id,
      isFlagged,
    );

    if (!updatedTicket) throw new NotFoundException('Failed to update ticket flag');

    await this.ticketsRepository.logActivity(
      id,
      actorId,
      'FLAG_UPDATED',
      {
        oldFlag: ticket.isFlagged || false,
        newFlag: isFlagged,
      },
      `User ${isFlagged ? 'flagged' : 'unflagged'} the ticket`,
    );

    return updatedTicket;
  }

  async updateDepartment(
    id: string,
    departmentId: string,
    actorId: string,
  ): Promise<Ticket> {
    const ticket = await this.getTicket(id);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException(
        'Cannot update department of a CLOSED ticket',
      );
    }

    const updatedTicket = await this.ticketsRepository.updateTicketDepartment(
      id,
      departmentId,
    );

    await this.ticketsRepository.logActivity(
      id,
      actorId,
      'DEPARTMENT_CHANGED',
      {
        oldDepartment: ticket.departmentId?._id?.toString() || 'UNASSIGNED',
        newDepartment: departmentId,
      },
      'Admin manually reassigned department',
    );

    if (!updatedTicket)
      throw new NotFoundException('Failed to update ticket department');
    return updatedTicket;
  }

  async updateSubDepartment(
    id: string,
    subDepartmentId: string,
    actorId: string,
  ): Promise<Ticket> {
    const ticket = await this.getTicket(id);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException(
        'Cannot update sub-department of a CLOSED ticket',
      );
    }

    const updatedTicket = await this.ticketsRepository.updateTicketSubDepartment(
      id,
      subDepartmentId,
    );

    await this.ticketsRepository.logActivity(
      id,
      actorId,
      'SUB_DEPARTMENT_CHANGED',
      {
        oldSubDepartment: ticket.subDepartmentId?.toString() || 'UNASSIGNED',
        newSubDepartment: subDepartmentId,
      },
      'Admin manually reassigned sub-department',
    );

    if (!updatedTicket)
      throw new NotFoundException('Failed to update ticket sub-department');
    return updatedTicket;
  }

  async updateTatType(
    id: string,
    tatType: 'INTERNAL' | 'EXTERNAL',
    actorId: string,
  ): Promise<Ticket> {
    const ticket = await this.getTicket(id);
    const updatedTicket = await this.ticketsRepository.updateTicketTatType(
      id,
      tatType,
    );

    await this.logActivity(
      id,
      actorId,
      'TAT_TYPE_CHANGED',
      {
        oldTatType: ticket.tatType,
        newTatType: tatType,
      },
      'Admin manually changed TAT type',
    );

    if (!updatedTicket)
      throw new NotFoundException('Failed to update ticket TAT type');
    return updatedTicket;
  }

  async updateTicketMessageId(id: string, messageId: string) {
    return this.ticketsRepository.updateTicketMessageId(id, messageId);
  }

  private async sendEmailDirectly(
    ticket: any,
    subjectPrefix: string,
    bodyText: string,
    googleAuthService: any,
    cc?: string[],
    to?: string[],
  ) {
    let auth;
    if (ticket.gmailConnectionId) {
      auth = await googleAuthService.getAuthClientForConnection(ticket.gmailConnectionId.toString());
    } else {
      auth = await googleAuthService.getAuthClient();
    }
    const { google } = require('googleapis');
    const gmail = google.gmail({ version: 'v1', auth });

    // Fetch the authenticated user's email address
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const fromEmail = profile.data.emailAddress;

    let subject = (ticket.subject === 'No Subject' || ticket.subject === '(no subject)') ? '' : (ticket.subject || '');
    if (subjectPrefix && subject && !subject.toLowerCase().startsWith('re:')) {
      subject = `${subjectPrefix} ${subject}`;
    }

    // Ensure we have a valid RFC Message-ID for thread replies
    const activeThreadId = ticket.gmailThreadId || ticket.threadId;
    let targetMessageId = ticket.messageId; // legacy support

    if (!targetMessageId) {
      const { messages: ticketMsgs } = await this.ticketsRepository.getTimeline(ticket._id.toString());
      const lastInbound = ticketMsgs.slice().reverse().find((m: any) => m.direction === 'INBOUND' && m.messageId);
      if (lastInbound) {
        targetMessageId = lastInbound.messageId;
      }
    }

    if (
      (!targetMessageId || !targetMessageId.includes('@')) &&
      activeThreadId
    ) {
      try {
        this.logger.log(
          `Ticket ${ticket.ticketNumber} missing RFC Message-ID. Searching Gmail thread ${activeThreadId}...`,
        );
        const threadRes = await gmail.users.threads.get({
          userId: 'me',
          id: activeThreadId,
          format: 'full',
        });
        const messagesInThread = threadRes.data.messages || [];
        for (const msgItem of messagesInThread) {
          if (msgItem.payload?.headers) {
            const foundRfcId = msgItem.payload.headers.find(
              (h: any) => h.name?.toLowerCase() === 'message-id',
            )?.value;
            if (foundRfcId && foundRfcId.includes('@')) {
              targetMessageId = foundRfcId;
              this.logger.log(
                `Found RFC Message-ID in Gmail thread: ${foundRfcId}`,
              );
              // We might not have updateTicketMessageId anymore or it's fine
              break;
            }
          }
        }
      } catch (e) {
        this.logger.error(
          'Failed to fetch original thread Message-ID from Gmail',
          e,
        );
      }
    }

    const toEmails = to && to.length > 0 ? to.join(', ') : ticket.customerEmail;
    const emailLines = [
      `From: ${fromEmail}`,
      `To: ${toEmails}`,
    ];
    if (cc && cc.length > 0) {
      emailLines.push(`Cc: ${cc.join(', ')}`);
    }
    if (subject) {
      const encodedSubject = `=?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
      emailLines.push(`Subject: ${encodedSubject}`);
    }

    if (targetMessageId) {
      const formattedMessageId =
        targetMessageId.startsWith('<') && targetMessageId.endsWith('>')
          ? targetMessageId
          : `<${targetMessageId}>`;
      emailLines.push(`In-Reply-To: ${formattedMessageId}`);
      emailLines.push(`References: ${formattedMessageId}`);
      this.logger.log(
        `Sending email reply with In-Reply-To: ${formattedMessageId}`,
      );
    } else {
      this.logger.warn(
        `No RFC Message-ID found for ticket ${ticket.ticketNumber}`,
      );
    }

    emailLines.push('Content-Type: text/plain; charset=utf-8');
    emailLines.push('MIME-Version: 1.0');
    emailLines.push('');
    emailLines.push(bodyText);

    const emailStr = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(emailStr, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const requestBody: any = { raw: encodedEmail };
    if (activeThreadId) {
      requestBody.threadId = activeThreadId;
    }

    await gmail.users.messages.send({
      userId: 'me',
      requestBody,
    });
  }

  async getTimeline(id: string) {
    const ticket = await this.getTicket(id); // ensure exists
    const { messages, logs } = await this.ticketsRepository.getTimeline(
      (ticket as any).id || (ticket as any)._id,
    );
    
    if ((ticket as any).hasUnreadReply) {
      await this.ticketsRepository.markAsRead(id);
    }

    // Merge and sort chronologically
    const timeline = [
      ...messages.map((m) => ({
        type: 'MESSAGE',
        data: m,
        timestamp: m.receivedAt,
      })),
      ...logs.map((l) => ({
        type: 'ACTIVITY',
        data: l,
        timestamp: (l as any).createdAt,
      })),
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return timeline;
  }

  // Creates a ticket for supported departments or persists an inbox entry for other/unassigned emails
  async createTicket(payload: any): Promise<any> {
    return this.ticketsRepository.createTicket(
      {
        subject: payload.subject,
        customerEmail: payload.customerEmail,
        aiClassification: payload.aiClassification,
        departmentId: payload.departmentId,
        gmailConnectionId: payload.gmailConnectionId,
        gmailThreadId: payload.gmailThreadId,
      },
      payload.initialMessage,
      payload, // passing all metadata to the initial message
    );
  }

  async sendReply(
    id: string,
    bodyText: string,
    actorId: string,
    googleAuthService: any,
    cc?: string[],
    to?: string[],
  ) {
    const ticket = await this.getTicket(id);

    // Save outbound message to DB
    await this.ticketsRepository.addMessage(
      id,
      'OUTBOUND',
      'support@acme.com', // Would normally be dynamically fetched from SystemSettings
      to && to.length > 0 ? to : [ticket.customerEmail],
      `Re: ${ticket.subject}`,
      bodyText,
      undefined,
      { cc }
    );
    await this.ticketsRepository.logActivity(
      id,
      actorId,
      'AGENT_REPLY',
      {},
      'Agent sent a reply',
    );

    // Actually send the email via Gmail API
    try {
      await this.sendEmailDirectly(ticket, 'Re:', bodyText, googleAuthService, cc, to);
    } catch (e) {
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
      bodyText,
    );
    await this.ticketsRepository.logActivity(
      id,
      null,
      'SYSTEM_REPLY',
      {},
      'Automated ticket confirmation sent',
    );

    // Actually send the email via Gmail API
    try {
      await this.sendEmailDirectly(ticket, 'Re:', bodyText, googleAuthService);
    } catch (e) {
      console.error('Failed to send auto reply email', e);
    }

    return { success: true };
  }
}
