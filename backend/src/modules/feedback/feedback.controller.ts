import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get(':token')
  async validateToken(@Param('token') token: string) {
    const feedbackToken = await this.feedbackService.validateToken(token);
    return { data: { valid: true, ticketId: feedbackToken.ticketId } };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllFeedback() {
    const feedbackList = await this.feedbackService.getAllFeedbackRequests();
    return { data: feedbackList };
  }

  @Post(':token')
  async submitReview(
    @Param('token') token: string,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
  ) {
    const review = await this.feedbackService.submitReview(token, rating, comment);
    return {
      message: 'Feedback submitted successfully',
      review,
    };
  }
}
