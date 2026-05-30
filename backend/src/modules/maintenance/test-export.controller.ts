import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';

@Controller('test-export')
export class TestExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('excel')
  async testExcel(@Res() res: Response): Promise<void> {
    try {
      console.log('Testing Excel export...');
      
      // Create fake task data
      const fakeTasks: any[] = [
        {
          id: 1,
          task_type: 'Tưới nước',
          tree_id: 1,
          assigned_to: 1,
          scheduled_date: new Date('2026-05-01'),
          completed_at: null,
          notes: 'Test task 1',
          tree: {
            tree_code: 'TREE001',
            species: { common_name: 'Cây xanh test' }
          },
          assignedUser: {
            username: 'staff1',
            full_name: 'Nhân viên 1'
          }
        },
        {
          id: 2,
          task_type: 'Cắt tỉa',
          tree_id: 2,
          assigned_to: 2,
          scheduled_date: new Date('2026-05-02'),
          completed_at: new Date('2026-05-02'),
          notes: 'Test task 2',
          tree: {
            tree_code: 'TREE002',
            species: { common_name: 'Cây xanh test 2' }
          },
          assignedUser: {
            username: 'staff2',
            full_name: 'Nhân viên 2'
          }
        }
      ];

      const buffer = await this.exportService.exportToExcel(fakeTasks);
      console.log('Excel buffer created, size:', buffer.length);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="test.xlsx"');
      res.end(buffer);
    } catch (error) {
      console.error('Excel export error:', error);
      res.status(500).json({ 
        error: 'Excel export failed', 
        message: error.message,
        stack: error.stack 
      });
    }
  }

  @Get('pdf')
  async testPdf(@Res() res: Response): Promise<void> {
    try {
      console.log('Testing PDF export...');
      
      // Create fake task data
      const fakeTasks: any[] = [
        {
          id: 1,
          task_type: 'Tưới nước',
          tree_id: 1,
          assigned_to: 1,
          scheduled_date: new Date('2026-05-01'),
          completed_at: null,
          notes: 'Test task 1',
          tree: {
            tree_code: 'TREE001',
            species: { common_name: 'Cây xanh test' }
          },
          assignedUser: {
            username: 'staff1',
            full_name: 'Nhân viên 1'
          }
        },
        {
          id: 2,
          task_type: 'Cắt tỉa',
          tree_id: 2,
          assigned_to: 2,
          scheduled_date: new Date('2026-05-02'),
          completed_at: new Date('2026-05-02'),
          notes: 'Test task 2',
          tree: {
            tree_code: 'TREE002',
            species: { common_name: 'Cây xanh test 2' }
          },
          assignedUser: {
            username: 'staff2',
            full_name: 'Nhân viên 2'
          }
        }
      ];

      const buffer = await this.exportService.exportToPdf(fakeTasks);
      console.log('PDF buffer created, size:', buffer.length);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
      res.end(buffer);
    } catch (error) {
      console.error('PDF export error:', error);
      res.status(500).json({ 
        error: 'PDF export failed', 
        message: error.message,
        stack: error.stack 
      });
    }
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Test export controller is working',
      timestamp: new Date().toISOString()
    };
  }
}
