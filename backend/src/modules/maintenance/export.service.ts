import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { MaintenanceTask } from '../../entities/maintenance-task.entity';

// Lazy load pdfmake để tránh lỗi khởi tạo
let pdfMake: any = null;

function getPdfMake() {
  if (!pdfMake) {
    const pdfMakeBuild = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    
    // For pdfmake 0.2.x, vfs_fonts exports pdfMake.vfs
    pdfMakeBuild.vfs = pdfFonts.pdfMake.vfs;
    pdfMake = pdfMakeBuild;
  }
  return pdfMake;
}

const REPORT_TITLE = 'Báo cáo Bảo trì Cây Xanh - Quận Liên Chiểu';

const COLUMN_HEADERS = [
  'Task ID',
  'Loại bảo trì',
  'Tên cây',
  'Nhân viên',
  'Ngày hẹn',
  'Ngày hoàn thành',
  'Ghi chú',
];

function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTreeName(task: MaintenanceTask): string {
  return task.tree?.species?.common_name ?? task.tree?.tree_code ?? String(task.tree_id);
}

function getStaffName(task: MaintenanceTask): string {
  return task.assignedUser?.full_name ?? task.assignedUser?.username ?? String(task.assigned_to);
}

function buildRowData(task: MaintenanceTask): string[] {
  return [
    String(task.id),
    task.task_type ?? '',
    getTreeName(task),
    getStaffName(task),
    formatDate(task.scheduled_date),
    formatDate(task.completed_at ?? undefined),
    task.notes ?? '',
  ];
}

@Injectable()
export class ExportService {
  /**
   * Xuất danh sách maintenance tasks ra file Excel (.xlsx)
   * Trả về Buffer để stream về client
   */
  async exportToExcel(tasks: MaintenanceTask[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Urban Green Infrastructure System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Báo cáo bảo trì');

    // Định nghĩa columns với độ rộng phù hợp
    sheet.columns = [
      { header: 'Task ID',          key: 'id',           width: 10 },
      { header: 'Loại bảo trì',     key: 'task_type',    width: 18 },
      { header: 'Tên cây',          key: 'tree_name',    width: 22 },
      { header: 'Nhân viên',        key: 'staff_name',   width: 22 },
      { header: 'Ngày hẹn',         key: 'scheduled',    width: 16 },
      { header: 'Ngày hoàn thành',  key: 'completed',    width: 18 },
      { header: 'Ghi chú',          key: 'notes',        width: 35 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D32' }, // xanh lá đậm
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Thêm dữ liệu
    for (const task of tasks) {
      const row = buildRowData(task);
      sheet.addRow({
        id:          row[0],
        task_type:   row[1],
        tree_name:   row[2],
        staff_name:  row[3],
        scheduled:   row[4],
        completed:   row[5],
        notes:       row[6],
      });
    }

    // Border cho tất cả cells có dữ liệu
    const lastRow = sheet.lastRow?.number ?? 1;
    for (let r = 1; r <= lastRow; r++) {
      const row = sheet.getRow(r);
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top:    { style: 'thin' },
          left:   { style: 'thin' },
          bottom: { style: 'thin' },
          right:  { style: 'thin' },
        };
      });
    }

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Xuất danh sách maintenance tasks ra file PDF
   * Trả về Buffer để stream về client
   */
  async exportToPdf(tasks: MaintenanceTask[]): Promise<Buffer> {
    const pdfMakeInstance = getPdfMake();
    
    const today = new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Header row cho bảng
    const tableHeaderRow = COLUMN_HEADERS.map((h) => ({
      text: h,
      style: 'tableHeader',
    }));

    // Data rows
    const tableDataRows = tasks.map((task) =>
      buildRowData(task).map((cell) => ({ text: cell, style: 'tableCell' })),
    );

    const docDefinition: any = {
      pageOrientation: 'landscape',
      pageMargins: [30, 50, 30, 50],

      content: [
        // Tiêu đề báo cáo
        {
          text: REPORT_TITLE,
          style: 'reportTitle',
          alignment: 'center',
          margin: [0, 0, 0, 16],
        },

        // Bảng dữ liệu
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', '*', 'auto', 'auto', '*'],
            body: [tableHeaderRow, ...tableDataRows],
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return '#2E7D32';
              return rowIndex % 2 === 0 ? '#F5F5F5' : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#BDBDBD',
            vLineColor: () => '#BDBDBD',
          },
        },
      ],

      // Footer: ngày xuất báo cáo
      footer: (_currentPage: number, _pageCount: number) => ({
        columns: [
          {
            text: `Ngày xuất báo cáo: ${today}`,
            alignment: 'left',
            margin: [30, 0, 0, 0],
            style: 'footerText',
          },
          {
            text: `Trang ${_currentPage} / ${_pageCount}`,
            alignment: 'right',
            margin: [0, 0, 30, 0],
            style: 'footerText',
          },
        ],
        margin: [0, 10, 0, 0],
      }),

      styles: {
        reportTitle: {
          fontSize: 16,
          bold: true,
          color: '#1B5E20',
        },
        tableHeader: {
          fontSize: 9,
          bold: true,
          color: '#FFFFFF',
          alignment: 'center',
        },
        tableCell: {
          fontSize: 8,
          color: '#212121',
        },
        footerText: {
          fontSize: 8,
          color: '#757575',
          italics: true,
        },
      },
    };

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const pdfDoc = pdfMakeInstance.createPdf(docDefinition);
        
        // Use getBase64 instead of getBuffer as it's more reliable
        pdfDoc.getBase64((base64String: string) => {
          const buffer = Buffer.from(base64String, 'base64');
          resolve(buffer);
        }, (error: Error) => {
          reject(error);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}
