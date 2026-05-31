import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../entities/system-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
  ) {}

  /**
   * Lấy giá trị của một setting theo key
   * Nếu không tồn tại, trả về defaultValue
   */
  async getSetting(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
  }

  /**
   * Lấy giá trị setting dạng số
   */
  async getSettingAsNumber(key: string, defaultValue: number): Promise<number> {
    const value = await this.getSetting(key, String(defaultValue));
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Lấy tất cả settings
   */
  async getAllSettings(): Promise<SystemSetting[]> {
    return this.settingsRepository.find({
      order: { key: 'ASC' },
    });
  }

  /**
   * Cập nhật hoặc tạo mới một setting
   */
  async updateSetting(
    key: string,
    value: string,
    description?: string,
  ): Promise<SystemSetting> {
    let setting = await this.settingsRepository.findOne({ where: { key } });

    if (setting) {
      setting.value = String(value);
      setting.updated_at = new Date();
      if (description !== undefined) {
        setting.description = description;
      }
    } else {
      setting = this.settingsRepository.create({
        key,
        value,
        description: description || null,
      });
    }

    return this.settingsRepository.save(setting);
  }

  /**
   * Xóa một setting
   */
  async deleteSetting(key: string): Promise<void> {
    await this.settingsRepository.delete({ key });
  }

  /**
   * Khởi tạo các settings mặc định nếu chưa tồn tại
   */
  async initializeDefaultSettings(): Promise<void> {
    const defaults = [
      {
        key: 'geofencing_radius_meters',
        value: '10',
        description: 'Bán kính cho phép nhân viên xác nhận hoàn thành công việc (Geofencing) - đơn vị: mét',
      },
    ];

    for (const defaultSetting of defaults) {
      const existing = await this.settingsRepository.findOne({
        where: { key: defaultSetting.key },
      });

      if (!existing) {
        await this.settingsRepository.save(
          this.settingsRepository.create(defaultSetting),
        );
      }
    }
  }
}
