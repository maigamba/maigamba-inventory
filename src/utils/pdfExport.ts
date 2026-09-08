import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, Sale, Expense, UserProfile } from '../types/inventory';
import { formatCurrency, formatDate } from './formatters';

export interface AuditReportData {
  reportTitle: string;
  periodLabel: string;
  generatedBy?: string;
  storeAddress?: string;
  summaryMetrics: {
    label: string;
    value: string;
  }[];
  tableHeaders: string[];
  tableRows: (string | number)[][];
  fileNamePrefix?: string;
}

const STORE_NAME = 'MAIGAMBA COMPUTER TECHNOLOGY';
const STORE_ADDRESS = 'No. 101 yayo Plaza farm Center Kano State. Nigeria';
const STORE_CONTACT = 'Phone: +234 800 MAIGAMBA • Email: contact@maigamba.com';

/**
 * Generates an official, publication-quality PDF audit document
 */
export const generateAuditPDF = (data: AuditReportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Background bar
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(STORE_NAME, margin, 11);

  // Address and Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(215, 215, 215);
  doc.text(STORE_ADDRESS, margin, 17);
  doc.text(STORE_CONTACT, margin, 22);

  // Report Title Badge on top-right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(245, 197, 66); // Gold / Amber
  doc.text(data.reportTitle.toUpperCase(), pageWidth - margin, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 17, { align: 'right' });
  doc.text(`Auditor: ${data.generatedBy || 'Authorized Staff'}`, pageWidth - margin, 22, { align: 'right' });

  // Metadata Subheader
  let currentY = 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 26);
  doc.text(data.reportTitle, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Filter Window: ${data.periodLabel} • Official Inventory & Revenue Ledger Audit`, margin, currentY + 5);

  currentY += 10;

  // KPI Summary Metric Cards (Up to 4 columns)
  if (data.summaryMetrics && data.summaryMetrics.length > 0) {
    const cardGap = 3;
    const cardCount = Math.min(data.summaryMetrics.length, 4);
    const availableWidth = pageWidth - (margin * 2) - (cardGap * (cardCount - 1));
    const cardWidth = availableWidth / cardCount;
    const cardHeight = 14;

    data.summaryMetrics.slice(0, 4).forEach((metric, index) => {
      const cardX = margin + (index * (cardWidth + cardGap));
      
      // Card container
      doc.setFillColor(248, 246, 242);
      doc.setDrawColor(220, 218, 212);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Metric Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 120, 120);
      doc.text(metric.label.toUpperCase(), cardX + 3, currentY + 4.5);

      // Metric Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(26, 26, 26);
      doc.text(metric.value, cardX + 3, currentY + 10.5);
    });

    currentY += cardHeight + 6;
  }

  // AutoTable Data Table
  autoTable(doc, {
    startY: currentY,
    head: [data.tableHeaders],
    body: data.tableRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [35, 35, 35],
      lineColor: [225, 222, 215],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [26, 26, 26],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [252, 250, 247],
    },
    didDrawPage: (hookData) => {
      // Footer on every page
      const pageNum = hookData.pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      
      // Left: Store disclaimer
      doc.text(
        `Maigamba Computer Technology • Official Audit Register • ${STORE_ADDRESS}`,
        margin,
        pageHeight - 6
      );

      // Right: Page count
      doc.text(
        `Page ${pageNum}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: 'right' }
      );
    },
  });

  const cleanPrefix = data.fileNamePrefix || data.reportTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const safeDate = now.toISOString().slice(0, 10);
  doc.save(`Maigamba_${cleanPrefix}_${safeDate}.pdf`);
};
