import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeedbackToken, FeedbackTokenDocument } from './schemas/feedback-token.schema';
import { Review, ReviewDocument } from './schemas/review.schema';
import * as crypto from 'crypto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(FeedbackToken.name) private feedbackTokenModel: Model<FeedbackTokenDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  async generateToken(ticketId: string, userId: string): Promise<string> {
    const token = crypto.randomUUID();
    // Expire in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const feedbackToken = new this.feedbackTokenModel({
      token,
      ticketId,
      userId,
      expiresAt,
    });

    await feedbackToken.save();
    return token;
  }

  async validateToken(token: string): Promise<FeedbackTokenDocument> {
    const feedbackToken = await this.feedbackTokenModel.findOne({ token }).populate('ticketId').exec();
    
    if (!feedbackToken) {
      throw new NotFoundException('Feedback link is invalid.');
    }
    
    if (feedbackToken.isUsed) {
      throw new BadRequestException('Feedback has already been submitted for this ticket.');
    }

    if (new Date() > feedbackToken.expiresAt) {
      throw new BadRequestException('Feedback link has expired.');
    }

    return feedbackToken;
  }

  async submitReview(token: string, rating: number, comment?: string): Promise<ReviewDocument> {
    const feedbackToken = await this.validateToken(token);

    // Get the agent who resolved it. We assume ticket has an assignedTo field.
    const ticket = feedbackToken.ticketId as any;
    const agentId = ticket.assignedTo;

    if (!agentId) {
      throw new BadRequestException('Cannot submit review for an unassigned ticket.');
    }

    const review = new this.reviewModel({
      ticketId: ticket._id,
      agentId,
      rating,
      comment,
    });

    await review.save();

    feedbackToken.isUsed = true;
    await feedbackToken.save();

    return review;
  }

  async getFeedbackForTicket(ticketId: string): Promise<any> {
    const mongoose = require('mongoose');
    const objectId = new mongoose.Types.ObjectId(ticketId);

    const token = await this.feedbackTokenModel.findOne({ ticketId: objectId }).sort({ createdAt: -1 }).exec();
    const review = await this.reviewModel.findOne({ ticketId: objectId }).sort({ createdAt: -1 }).exec();
    
    return {
      tokenSent: !!token,
      status: token ? (token.isUsed ? 'COMPLETED' : (new Date() > token.expiresAt ? 'EXPIRED' : 'PENDING')) : 'NOT_SENT',
      review: review || null
    };
  }

  async getAllFeedbackRequests(): Promise<any[]> {
    return this.feedbackTokenModel.aggregate([
      {
        $lookup: {
          from: 'tickets',
          localField: 'ticketId',
          foreignField: '_id',
          as: 'ticket',
        },
      },
      {
        $unwind: { path: '$ticket', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'reviews',
          localField: 'ticketId',
          foreignField: 'ticketId',
          as: 'review',
        },
      },
      {
        $unwind: { path: '$review', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'ticket.assignedTo',
          foreignField: '_id',
          as: 'agent',
        },
      },
      {
        $unwind: { path: '$agent', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          token: 1,
          createdAt: 1,
          expiresAt: 1,
          isUsed: 1,
          customerEmail: '$userId', // userId holds the email string
          ticketNumber: '$ticket.ticketNumber',
          agentName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$agent.firstName', ''] },
                  ' ',
                  { $ifNull: ['$agent.lastName', ''] },
                ],
              },
            },
          },
          agentEmail: '$agent.email',
          rating: '$review.rating',
          comment: '$review.comment',
          reviewDate: '$review.createdAt',
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]).exec();
  }
}
