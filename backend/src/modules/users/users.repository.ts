import { EntityRepository, Repository } from 'typeorm';
import { User } from '../auth/user.entity';

@EntityRepository(User)
export class UsersRepository extends Repository<User> {
  async findByRole(role: string): Promise<User[]> {
    return this.find({ where: { role } });
  }
}
