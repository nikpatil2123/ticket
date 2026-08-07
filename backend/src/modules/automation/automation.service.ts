import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AutomationRule,
  AutomationEvent,
  ConditionOperator,
} from './schemas/automation-rule.schema';
import { TicketsService } from '../tickets/tickets.service';
import { Ticket } from '../tickets/schemas/ticket.schema';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectModel(AutomationRule.name)
    private automationRuleModel: Model<AutomationRule>,
    private readonly ticketsService: TicketsService,
  ) {}

  async evaluateRules(event: AutomationEvent, ticket: Ticket): Promise<void> {
    const rules = await this.automationRuleModel
      .find({ eventTrigger: event, isActive: true })
      .sort({ executionOrder: 1 })
      .exec();

    for (const rule of rules) {
      const isMatch = this.evaluateConditions(rule, ticket);

      if (isMatch) {
        this.logger.log(
          `Rule matched: ${rule.name} for Ticket: ${ticket.ticketNumber}`,
        );
        await this.executeActions(rule, ticket);

        if (rule.stopProcessing) {
          break;
        }
      }
    }
  }

  private evaluateConditions(rule: AutomationRule, ticket: Ticket): boolean {
    if (!rule.conditions || rule.conditions.length === 0) return true;

    const results = rule.conditions.map((condition) => {
      // Basic nested object property access (e.g. "aiClassification.intent")
      const fieldValue = condition.field
        .split('.')
        .reduce((o, i) => (o ? o[i] : null), ticket as any);

      switch (condition.operator) {
        case ConditionOperator.EQUALS:
          return fieldValue === condition.value;
        case ConditionOperator.NOT_EQUALS:
          return fieldValue !== condition.value;
        case ConditionOperator.CONTAINS:
          return (
            fieldValue && String(fieldValue).includes(String(condition.value))
          );
        default:
          return false;
      }
    });

    return rule.conditionLogic === 'AND'
      ? results.every((res) => res === true)
      : results.some((res) => res === true);
  }

  private async executeActions(
    rule: AutomationRule,
    ticket: Ticket,
  ): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'SET_STATUS':
            // Logic handled by TicketsService. Assuming 'system' actor.
            await this.ticketsService.updateStatus(
              (ticket as any).id || (ticket as any)._id,
              { status: action.value },
              'system',
            );
            // Updating local ticket object for subsequent rules in the loop
            ticket.status = action.value;
            break;
          // Implement other actions here
        }
      } catch (error) {
        this.logger.error(
          `Action failed: ${action.type} for Rule: ${rule.name}`,
          error,
        );
      }
    }
  }
}
