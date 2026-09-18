import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole, UserStatus } from '../../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { phone } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { username } });
  }

  /** Находит пользователя по телефону (+375XXXXXXXXX) либо по логину (например, "admin"). */
  findByLoginIdentifier(identifier: string): Promise<User | null> {
    if (/^\+375\d{9}$/.test(identifier)) {
      return this.findByPhone(identifier);
    }
    return this.findByUsername(identifier);
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  createUser(phone: string, passwordHash: string, roles: UserRole[]): Promise<User> {
    const user = this.usersRepo.create({ phone, passwordHash, roles, phoneVerified: true });
    return this.usersRepo.save(user);
  }

  async createServiceAccount(
    username: string,
    passwordHash: string,
    roles: UserRole[],
  ): Promise<User> {
    const user = this.usersRepo.create({
      username,
      phone: null,
      passwordHash,
      roles,
      phoneVerified: false,
    });
    return this.usersRepo.save(user);
  }

  /** Создание учётной записи администратором — без OTP, с телефоном или логином. */
  async adminCreateUser(input: { login: string; roles: UserRole[]; passwordHash: string }): Promise<User> {
    const isPhone = /^\+375\d{9}$/.test(input.login);
    const existing = isPhone ? await this.findByPhone(input.login) : await this.findByUsername(input.login);
    if (existing) {
      throw new ConflictException('Пользователь с таким логином уже существует');
    }
    const user = this.usersRepo.create({
      phone: isPhone ? input.login : null,
      username: isPhone ? null : input.login,
      passwordHash: input.passwordHash,
      roles: input.roles,
      phoneVerified: isPhone,
    });
    return this.usersRepo.save(user);
  }

  async addRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.findByIdOrThrow(userId);
    if (!user.roles.includes(role)) {
      user.roles.push(role);
      await this.usersRepo.save(user);
    }
    return user;
  }

  async setRoles(userId: string, roles: UserRole[]): Promise<User> {
    if (roles.length === 0) {
      throw new BadRequestException('У пользователя должна быть хотя бы одна роль');
    }
    const user = await this.findByIdOrThrow(userId);
    user.roles = roles;
    return this.usersRepo.save(user);
  }

  async setStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.findByIdOrThrow(userId);
    user.status = status;
    return this.usersRepo.save(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.findByIdOrThrow(userId);
    await this.usersRepo.remove(user);
  }

  save(user: User): Promise<User> {
    return this.usersRepo.save(user);
  }

  list(): Promise<User[]> {
    return this.usersRepo.find({ relations: { profile: true }, order: { createdAt: 'DESC' } });
  }

  count(): Promise<number> {
    return this.usersRepo.count();
  }
}
