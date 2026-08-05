import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticket, TicketStatus, TicketPriority } from './schemas/ticket.schema';
import { Message } from './schemas/message.schema';
import { ActivityLog } from './schemas/activity-log.schema';

import { Attachment } from '../email/schemas/attachment.schema';

@Injectable()
export class TicketsRepository {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<Ticket>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLog>,
    @InjectModel(Attachment.name) private attachmentModel: Model<Attachment>,
  ) {}

  async findAll(departmentId?: string): Promise<Ticket[]> {
    const filter = departmentId ? { departmentId } : {};
    return this.ticketModel.find(filter).sort({ updatedAt: -1 }).populate('departmentId assignedTo').exec();
  }

  async findTicketById(id: string): Promise<Ticket | null> {
    return this.ticketModel.findById(id).populate('departmentId assignedTo').exec();
  }

  async findTicketByThreadId(threadId: string): Promise<Ticket | null> {
    if (!threadId) return null;
    return this.ticketModel.findOne({ threadId }).populate('departmentId assignedTo').exec();
  }

  async findByTicketNumber(ticketNumber: string): Promise<Ticket | null> {
    return this.ticketModel.findOne({ ticketNumber }).populate('departmentId assignedTo').exec();
  }

  async updateTicketStatus(id: string, status: TicketStatus, resolvedAt?: Date): Promise<Ticket | null> {
    const updatePayload: any = { status, updatedAt: new Date() };
    if (resolvedAt !== undefined) {
      updatePayload.resolvedAt = resolvedAt;
    }
    return this.ticketModel.findByIdAndUpdate(id, updatePayload, { new: true }).exec();
  }

  async updateTicketMessageId(id: string, messageId: string): Promise<Ticket | null> {
    return this.ticketModel.findByIdAndUpdate(id, { messageId, updatedAt: new Date() }, { new: true }).exec();
  }

  async logActivity(ticketId: string, actorId: string | null, action: string, changes?: any, note?: string): Promise<ActivityLog> {
    const log = new this.activityLogModel({ ticketId, actorId, action, changes, note });
    return log.save();
  }

  async getTimeline(ticketId: string): Promise<{ messages: any[], logs: ActivityLog[] }> {
    let messages = await this.messageModel.find({ ticketId }).sort({ receivedAt: 1 }).lean().exec();
    const logs = await this.activityLogModel.find({ ticketId }).sort({ createdAt: 1 }).lean().exec();
    
    // Deduplicate any historical duplicate inbound messages (same bodyText & direction created within 2 min)
    const uniqueMessages: any[] = [];
    for (const msg of messages) {
      const isDuplicate = uniqueMessages.some(prev => 
        prev.direction === msg.direction &&
        prev.bodyText === msg.bodyText &&
        prev.from === msg.from &&
        Math.abs(new Date(prev.receivedAt).getTime() - new Date(msg.receivedAt).getTime()) < 120000
      );
      if (!isDuplicate) {
        uniqueMessages.push(msg);
      }
    }
    messages = uniqueMessages;

    // Fetch attachments for messages
    if (messages.length > 0) {
      const messageIds = messages.map(m => m._id);
      const attachments = await this.attachmentModel.find({ messageId: { $in: messageIds } }).lean().exec();
      
      const attachmentsByMessageId: Record<string, any[]> = {};
      for (const att of attachments) {
        const msgIdStr = att.messageId.toString();
        if (!attachmentsByMessageId[msgIdStr]) {
          attachmentsByMessageId[msgIdStr] = [];
        }
        const alreadyHas = attachmentsByMessageId[msgIdStr].some(existing => existing.fileName === att.fileName && existing.size === att.size);
        if (!alreadyHas) {
          attachmentsByMessageId[msgIdStr].push(att);
        }
      }
      
      for (let m of messages as any[]) {
        m.attachments = attachmentsByMessageId[m._id.toString()] || [];
      }
    }

    return { messages, logs: logs as any };
  }

  async createTicket(ticketData: Partial<Ticket>, initialMessage: string): Promise<{ ticket: Ticket, message: Message }> {
    // Fetch the correct department based on AI classification (MIS or LMS)
    const mongoose = require('mongoose');
    let deptId = new mongoose.Types.ObjectId(); // Fallback if none found
    try {
      const intentName = ticketData.aiClassification?.intent || 'MIS';
      const db = this.ticketModel.db;
      let dept = await db.collection('departments').findOne({ name: intentName });
      if (!dept) {
        dept = await db.collection('departments').findOne({});
      }
      if (dept) deptId = dept._id;
    } catch(e) {
      console.error('Failed to assign department', e);
    }

    const ticket = new this.ticketModel({
      ...ticketData,
      ticketNumber: `TKT-${Date.now()}`,
      departmentId: deptId,
      status: TicketStatus.OPEN,
      priority: 'P3' as TicketPriority
    });
    const savedTicket = await ticket.save();

    const message = new this.messageModel({
      ticketId: savedTicket._id,
      threadId: ticketData.threadId || savedTicket._id.toString(),
      messageId: ticketData.messageId || `msg_${Date.now()}`,
      direction: 'INBOUND',
      from: ticketData.customerEmail,
      to: ['support@acme.com'], // The support inbox
      subject: ticketData.subject,
      bodyText: initialMessage,
      receivedAt: new Date(),
    });
    await message.save();

    await this.logActivity(savedTicket._id.toString(), null, 'TICKET_CREATED', {}, 'Ticket automatically created via Email Ingestion');
    return { ticket: savedTicket, message };
  }

  async findMessageByMessageId(messageId: string): Promise<Message | null> {
    if (!messageId) return null;
    return this.messageModel.findOne({ messageId }).exec();
  }

  async addMessage(ticketId: string, direction: string, from: string, to: string[], subject: string, bodyText: string, messageId?: string): Promise<Message> {
    const message = new this.messageModel({
      ticketId,
      threadId: ticketId,
      messageId: messageId || `msg_${Date.now()}`,
      direction,
      from,
      to,
      subject,
      bodyText,
      receivedAt: new Date()
    });

    // Touch the ticket's updatedAt timestamp so it jumps to top of queue
    await this.ticketModel.findByIdAndUpdate(ticketId, { updatedAt: new Date() }).exec();

    return message.save();
  }
}
