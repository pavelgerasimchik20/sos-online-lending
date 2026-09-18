import { Column, Entity, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { UserRole, UserStatus } from '../../common/enums';
import { Profile } from '../profiles/profile.entity';

@Entity('users')
export class User extends BaseEntity {
  /** Телефон — основной логин обычных пользователей. Null у служебных учётных записей (например, admin). */
  @Column({ type: 'varchar', unique: true, nullable: true })
  phone: string | null;

  /** Альтернативный логин (например, "admin") для учётных записей без телефона. */
  @Column({ type: 'varchar', unique: true, nullable: true })
  username: string | null;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, array: true, default: [UserRole.BORROWER] })
  roles: UserRole[];

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ default: false })
  phoneVerified: boolean;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile?: Profile;
}
