import { ExtractJwt, Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlacklistedToken } from './schemas/blacklisted-token.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @InjectModel(BlacklistedToken.name)
    private blacklistedTokenModel: Model<BlacklistedToken>,
  ) {
    const options: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['token'];
          }
          return token;
        },
        ExtractJwt.fromUrlQueryParameter('token'),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || '',
    };
    super(options);
  }

  async validate(payload: any) {
    const user = await this.usersService.getUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not authorized or inactive');
    }
    return user;
  }
}
