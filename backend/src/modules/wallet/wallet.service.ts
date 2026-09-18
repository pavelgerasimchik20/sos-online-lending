import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LenderWallet } from './lender-wallet.entity';
import { WalletTransaction, WalletTransactionType } from './wallet-transaction.entity';
import { round2 } from '../../common/loan-math';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(LenderWallet)
    private readonly walletRepo: Repository<LenderWallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
  ) {}

  async getOrCreate(userId: string): Promise<LenderWallet> {
    let wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.walletRepo.save(this.walletRepo.create({ userId }));
    }
    return wallet;
  }

  async topUp(userId: string, amountByn: number): Promise<LenderWallet> {
    if (amountByn <= 0) {
      throw new BadRequestException('Сумма пополнения должна быть положительной');
    }
    const wallet = await this.getOrCreate(userId);
    wallet.balanceByn = round2(Number(wallet.balanceByn) + amountByn);
    await this.walletRepo.save(wallet);
    await this.recordTx(userId, WalletTransactionType.TOPUP_MOCK, amountByn, wallet.balanceByn, undefined, 'Пополнение кошелька (мок)');
    return wallet;
  }

  async debit(
    userId: string,
    amountByn: number,
    type: WalletTransactionType,
    relatedEntityId?: string,
    description?: string,
  ): Promise<LenderWallet> {
    const wallet = await this.getOrCreate(userId);
    if (Number(wallet.balanceByn) < amountByn) {
      throw new BadRequestException('Недостаточно средств на балансе кошелька');
    }
    wallet.balanceByn = round2(Number(wallet.balanceByn) - amountByn);
    if (type === WalletTransactionType.COMMITMENT_HOLD) {
      wallet.totalInvestedByn = round2(Number(wallet.totalInvestedByn) + amountByn);
    }
    await this.walletRepo.save(wallet);
    await this.recordTx(userId, type, -amountByn, wallet.balanceByn, relatedEntityId, description);
    return wallet;
  }

  async credit(
    userId: string,
    amountByn: number,
    type: WalletTransactionType,
    relatedEntityId?: string,
    description?: string,
  ): Promise<LenderWallet> {
    const wallet = await this.getOrCreate(userId);
    wallet.balanceByn = round2(Number(wallet.balanceByn) + amountByn);
    if (type === WalletTransactionType.PAYOUT_INTEREST) {
      wallet.totalEarnedInterestByn = round2(Number(wallet.totalEarnedInterestByn) + amountByn);
    }
    if (type === WalletTransactionType.COMMITMENT_REFUND) {
      wallet.totalInvestedByn = round2(Number(wallet.totalInvestedByn) - amountByn);
    }
    await this.walletRepo.save(wallet);
    await this.recordTx(userId, type, amountByn, wallet.balanceByn, relatedEntityId, description);
    return wallet;
  }

  private async recordTx(
    userId: string,
    type: WalletTransactionType,
    amountByn: number,
    balanceAfterByn: number,
    relatedEntityId?: string,
    description?: string,
  ): Promise<void> {
    await this.txRepo.save(
      this.txRepo.create({ userId, type, amountByn, balanceAfterByn, relatedEntityId, description }),
    );
  }

  history(userId: string): Promise<WalletTransaction[]> {
    return this.txRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}
