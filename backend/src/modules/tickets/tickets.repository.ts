import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
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

  async findAll(departmentId?: string, tatType?: string, priority?: string): Promise<Ticket[]> {
    const filter: any = {};
    if (departmentId) filter.departmentId = departmentId;
    if (tatType) filter.tatType = tatType;
    if (priority) filter.priority = priority;
    return this.ticketModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .populate('departmentId assignedTo')
      .exec();
  }

  async updateRequestCount(
    id: string,
    requestCount: number,
  ): Promise<Ticket | null> {
    return this.ticketModel
      .findByIdAndUpdate(
        id,
        { $set: { requestCount } },
        { new: true }
      )
      .exec();
  }

  async updateTicketPriority(
    id: string,
    priority: TicketPriority,
  ): Promise<Ticket | null> {
    return this.ticketModel
      .findByIdAndUpdate(
        id,
        { $set: { priority } },
        { new: true }
      )
      .exec();
  }

  async getTicketStats(departmentId?: string, startDate?: string, endDate?: string): Promise<any[]> {
    const matchStage: any = {};
    if (departmentId) {
      matchStage.departmentId = new mongoose.Types.ObjectId(departmentId);
    }
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    return this.ticketModel
      .aggregate([
        { $match: matchStage },
        { 
          $group: { 
            _id: '$status', 
            count: { $sum: 1 },
            requestCountSum: { $sum: { $ifNull: ['$requestCount', 1] } }
          } 
        },
      ])
      .exec();
  }

  async getAgentStats(startDate?: string, endDate?: string, internalSlaMs: number = 86400000, externalSlaMs: number = 172800000): Promise<any[]> {
    const ticketMatchConditions: any[] = [
      { $eq: ['$assignedTo', '$$userId'] },
      { $in: ['$status', ['CLOSED', 'RESOLVED']] },
    ];
    
    // Pass string parameters instead of Date objects to avoid serialization issues inside $expr if needed, 
    // but standard $match allows normal Date queries if placed outside $expr. 
    // Let's use a standard $match for the dates.
    const dateMatch: any = {};
    if (startDate || endDate) {
      dateMatch.createdAt = {};
      if (startDate) dateMatch.createdAt.$gte = new Date(startDate);
      if (endDate) dateMatch.createdAt.$lte = new Date(endDate);
    }

    return this.ticketModel.db
      .collection('users')
      .aggregate([
        {
          $lookup: {
            from: 'tickets',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  ...dateMatch,
                  $expr: {
                    $and: ticketMatchConditions,
                  },
                },
              },
              {
                $addFields: {
                  rawResolutionTimeMs: {
                    $subtract: [
                      { $ifNull: ['$resolvedAt', '$updatedAt'] },
                      { $ifNull: ['$inProgressAt', '$createdAt'] },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  resolutionTimeMs: {
                    $max: [
                      0,
                      {
                        $subtract: [
                          '$rawResolutionTimeMs',
                          {
                            $add: [
                              { $ifNull: ['$totalPausedTimeMs', 0] },
                              {
                                $cond: {
                                  if: { $ne: ['$pausedAt', null] },
                                  then: {
                                    $subtract: [
                                      {
                                        $ifNull: ['$resolvedAt', '$updatedAt'],
                                      },
                                      '$pausedAt',
                                    ],
                                  },
                                  else: 0,
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
            as: 'closedTickets',
          },
        },
        {
          $project: {
            _id: 1,
            agentName: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$firstName', ''] },
                    ' ',
                    { $ifNull: ['$lastName', ''] },
                  ],
                },
              },
            },
            agentEmail: '$email',
            closedCount: { $size: '$closedTickets' },
            avgCloseTimeMs: { $avg: '$closedTickets.resolutionTimeMs' },
            withinInternalSLA: {
              $size: {
                $filter: {
                  input: '$closedTickets',
                  as: 't',
                  cond: {
                    $and: [
                      { $eq: ['$$t.tatType', 'INTERNAL'] },
                      { $lte: ['$$t.resolutionTimeMs', internalSlaMs] },
                    ],
                  },
                },
              },
            },
            withinExternalSLA: {
              $size: {
                $filter: {
                  input: '$closedTickets',
                  as: 't',
                  cond: {
                    $and: [
                      { $eq: ['$$t.tatType', 'EXTERNAL'] },
                      { $lte: ['$$t.resolutionTimeMs', externalSlaMs] },
                    ],
                  },
                },
              },
            },
          },
        },
      ])
      .toArray();
  }

  async findTicketById(id: string): Promise<Ticket | null> {
    return this.ticketModel
      .findById(id)
      .populate('departmentId assignedTo')
      .exec();
  }

  async findTicketByThreadId(threadId: string): Promise<Ticket | null> {
    if (!threadId) return null;
    return this.ticketModel
      .findOne({ threadId })
      .populate('departmentId assignedTo')
      .exec();
  }

  async findByTicketNumber(ticketNumber: string): Promise<Ticket | null> {
    return this.ticketModel
      .findOne({ ticketNumber })
      .populate('departmentId assignedTo')
      .exec();
  }

  async getAgentDetailedStats(agentId: string, startDate?: string, endDate?: string, internalSlaMs: number = 86400000, externalSlaMs: number = 172800000): Promise<any> {
    const mongoose = require('mongoose');
    
    const dateMatch: any = {};
    if (startDate || endDate) {
      dateMatch.createdAt = {};
      if (startDate) dateMatch.createdAt.$gte = new Date(startDate);
      if (endDate) dateMatch.createdAt.$lte = new Date(endDate);
    }

    const result = await this.ticketModel.db
      .collection('users')
      .aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(agentId) },
        },
        {
          $lookup: {
            from: 'tickets',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  ...dateMatch,
                  $expr: {
                    $and: [
                      { $eq: ['$assignedTo', '$$userId'] },
                      { $in: ['$status', ['CLOSED', 'RESOLVED']] },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  rawResolutionTimeMs: {
                    $subtract: [
                      { $ifNull: ['$resolvedAt', '$updatedAt'] },
                      { $ifNull: ['$inProgressAt', '$createdAt'] },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  resolutionTimeMs: {
                    $max: [
                      0,
                      {
                        $subtract: [
                          '$rawResolutionTimeMs',
                          {
                            $add: [
                              { $ifNull: ['$totalPausedTimeMs', 0] },
                              {
                                $cond: {
                                  if: { $ne: ['$pausedAt', null] },
                                  then: {
                                    $subtract: [
                                      {
                                        $ifNull: ['$resolvedAt', '$updatedAt'],
                                      },
                                      '$pausedAt',
                                    ],
                                  },
                                  else: 0,
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $sort: { createdAt: -1 },
              },
            ],
            as: 'closedTickets',
          },
        },
        {
          $project: {
            _id: 1,
            agentName: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$firstName', ''] },
                    ' ',
                    { $ifNull: ['$lastName', ''] },
                  ],
                },
              },
            },
            agentEmail: '$email',
            closedCount: { $size: '$closedTickets' },
            avgCloseTimeMs: { $avg: '$closedTickets.resolutionTimeMs' },
            closedTickets: 1,
          },
        },
      ])
      .toArray();
    return result[0];
  }

  async updateTicketStatus(
    id: string,
    status: TicketStatus,
    resolvedAt?: Date,
    assignedTo?: string,
    extraFields?: any,
  ): Promise<Ticket | null> {
    const updatePayload: any = {
      status,
      updatedAt: new Date(),
      ...extraFields,
    };
    if (resolvedAt !== undefined) {
      updatePayload.resolvedAt = resolvedAt;
    }
    if (assignedTo !== undefined) {
      const mongoose = require('mongoose');
      updatePayload.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }
    return this.ticketModel
      .findByIdAndUpdate(id, updatePayload, { returnDocument: 'after' })
      .exec();
  }

  async updateTicketDepartment(
    id: string,
    departmentId: string,
  ): Promise<Ticket | null> {
    const mongoose = require('mongoose');
    return this.ticketModel
      .findByIdAndUpdate(
        id,
        {
          departmentId: new mongoose.Types.ObjectId(departmentId),
          updatedAt: new Date(),
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async updateTicketTatType(
    id: string,
    tatType: 'INTERNAL' | 'EXTERNAL',
  ): Promise<Ticket | null> {
    return this.ticketModel
      .findByIdAndUpdate(id, { tatType }, { returnDocument: 'after' })
      .exec();
  }

  async updateTicketMessageId(
    id: string,
    messageId: string,
  ): Promise<Ticket | null> {
    return this.ticketModel
      .findByIdAndUpdate(
        id,
        { messageId, updatedAt: new Date() },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async logActivity(
    ticketId: string,
    actorId: string | null,
    action: string,
    changes?: any,
    note?: string,
  ): Promise<ActivityLog> {
    const log = new this.activityLogModel({
      ticketId,
      actorId,
      action,
      changes,
      note,
    });
    return log.save();
  }

  async getTimeline(
    ticketId: string,
  ): Promise<{ messages: any[]; logs: ActivityLog[] }> {
    let messages = await this.messageModel
      .find({ ticketId })
      .sort({ receivedAt: 1 })
      .lean()
      .exec();
    const logs = await this.activityLogModel
      .find({ ticketId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    // Deduplicate any historical duplicate inbound messages (same bodyText & direction created within 2 min)
    const uniqueMessages: any[] = [];
    for (const msg of messages) {
      const isDuplicate = uniqueMessages.some(
        (prev) =>
          prev.direction === msg.direction &&
          prev.bodyText === msg.bodyText &&
          prev.from === msg.from &&
          Math.abs(
            new Date(prev.receivedAt).getTime() -
              new Date(msg.receivedAt).getTime(),
          ) < 120000,
      );
      if (!isDuplicate) {
        uniqueMessages.push(msg);
      }
    }
    messages = uniqueMessages;

    // Fetch attachments for messages
    if (messages.length > 0) {
      const messageIds = messages.map((m) => m._id);
      const attachments = await this.attachmentModel
        .find({ messageId: { $in: messageIds } })
        .lean()
        .exec();

      const attachmentsByMessageId: Record<string, any[]> = {};
      for (const att of attachments) {
        const msgIdStr = att.messageId.toString();
        if (!attachmentsByMessageId[msgIdStr]) {
          attachmentsByMessageId[msgIdStr] = [];
        }
        const alreadyHas = attachmentsByMessageId[msgIdStr].some(
          (existing) =>
            existing.fileName === att.fileName && existing.size === att.size,
        );
        if (!alreadyHas) {
          attachmentsByMessageId[msgIdStr].push(att);
        }
      }

      for (const m of messages as any[]) {
        m.attachments = attachmentsByMessageId[m._id.toString()] || [];
      }
    }

    return { messages, logs: logs };
  }

  async createTicket(
    ticketData: Partial<Ticket>,
    initialMessage: string,
  ): Promise<{ ticket: Ticket; message: Message } | { inboxEntryId: string }> {
    // Fetch the correct department based on AI classification
    const mongoose = require('mongoose');
    let deptId = null;
    try {
      const intentName = ticketData.aiClassification?.intent || 'UNASSIGNED';
      if (intentName !== 'UNASSIGNED') {
        const db = this.ticketModel.db;
        const dept = await db
          .collection('departments')
          .findOne({ name: { $regex: new RegExp(`^${intentName}$`, 'i') } });
        if (dept) deptId = dept._id;
      }
    } catch (e) {
      console.error('Failed to assign department', e);
    }

    const intentName = ticketData.aiClassification?.intent || 'UNASSIGNED';
    const supportedIntents = ['SALARY', 'MIS_DETAILS_CHANGE', 'LEAVE', 'ATTENDANCE'];
    const isOther = !supportedIntents.includes(intentName);

    // If the email does not belong to supported departments, do NOT create a ticket.
    // Instead, persist to a separate inbox_entries collection for manual review.
    if (isOther) {
      try {
        const db = this.ticketModel.db;
        const inboxDoc: any = {
          subject: ticketData.subject,
          customerEmail: ticketData.customerEmail,
          aiClassification: ticketData.aiClassification || null,
          threadId: ticketData.threadId || null,
          messageId: ticketData.messageId || null,
          bodyText: initialMessage,
          createdAt: new Date(),
          processed: false,
        };
        const res = await db.collection('inbox_entries').insertOne(inboxDoc);
        // Do not create ActivityLog here because ActivityLog requires a ticketId. Inbox entries are for manual review.
        return { inboxEntryId: res.insertedId.toString() };
      } catch (err) {
        console.error('Failed to persist inbox entry for OTHER/UNASSIGNED email', err);
        throw err;
      }
    }

    const ticketPayload: any = {
      ...ticketData,
      departmentId: deptId,
      status: TicketStatus.OPEN,
      priority: 'P3' as TicketPriority,
    };

    ticketPayload.ticketNumber = `TKT-${Date.now()}`;

    const ticket = new this.ticketModel(ticketPayload);
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

    await this.logActivity(
      savedTicket._id.toString(),
      null,
      'TICKET_CREATED',
      {},
      'Ticket automatically created via Email Ingestion',
    );
    return { ticket: savedTicket, message };
  }

  async findMessageByMessageId(messageId: string): Promise<Message | null> {
    if (!messageId) return null;
    return this.messageModel.findOne({ messageId }).exec();
  }

  async addMessage(
    ticketId: string,
    direction: string,
    from: string,
    to: string[],
    subject: string,
    bodyText: string,
    messageId?: string,
  ): Promise<Message> {
    const message = new this.messageModel({
      ticketId,
      threadId: ticketId,
      messageId: messageId || `msg_${Date.now()}`,
      direction,
      from,
      to,
      subject,
      bodyText,
      receivedAt: new Date(),
    });

    // Touch the ticket's updatedAt timestamp so it jumps to top of queue
    await this.ticketModel
      .findByIdAndUpdate(ticketId, { updatedAt: new Date() })
      .exec();

    return message.save();
  }
}
