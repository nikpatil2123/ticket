import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwt.secret') ||
        'super_secret_for_development',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.getUserById(payload.sub);
    // Populate roleId and departmentId manually if getUserById doesn't, but UsersService can do it.
    // For now, getUserById throws if not found.
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not authorized or inactive');
    }
    return user;
  }
}
