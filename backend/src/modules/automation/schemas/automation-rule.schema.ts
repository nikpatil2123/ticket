import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AutomationEvent {
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_UPDATED = 'TICKET_UPDATED',
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
}

export enum ActionType {
  SET_STATUS = 'SET_STATUS',
}

@Schema()
export class Condition {
  @Prop({ required: true })
  field: string;

  @Prop({ type: String, enum: ConditionOperator, required: true })
  operator: ConditionOperator;

  @Prop({ required: true, type: Object })
  value: any;
}

@Schema()
export class Action {
  @Prop({ type: String, enum: ActionType, required: true })
  type: ActionType;

  @Prop({ required: true, type: Object })
  value: any;
}

@Schema({ timestamps: true })
export class AutomationRule extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: AutomationEvent, required: true, index: true })
  eventTrigger: AutomationEvent;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: 10 })
  executionOrder: number;

  @Prop({ required: true, default: false })
  stopProcessing: boolean;

  @Prop({ required: true, enum: ['AND', 'OR'], default: 'AND' })
  conditionLogic: 'AND' | 'OR';

  @Prop({ type: [Condition], required: true })
  conditions: Condition[];

  @Prop({ type: [Action], required: true })
  actions: Action[];
}

export const AutomationRuleSchema =
  SchemaFactory.createForClass(AutomationRule);
