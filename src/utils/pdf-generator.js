import 'jspdf-autotable';

import jsPDF from 'jspdf';

import { fDate } from './format-time';

export const generatePDF = (data, title, columns) => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${fDate(new Date())}`, 14, 25);

  // Format data for autotable
  const tableData = data.map(row => columns.map(col => row[col.key]));

  // Add table
  doc.autoTable({
    head: [columns.map(col => col.header)],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [75, 75, 75] },
  });

  // Save the PDF
  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${fDate(new Date())}.pdf`);
};

export const generateSelectedCandidatesPDF = (interviews) => {
  const columns = [
    { header: 'Applicant Name', key: 'applicantName' },
    { header: 'Job Title', key: 'jobTitle' },
    { header: 'Application Date', key: 'applicationDate' },
    { header: 'Joining Date', key: 'joiningDate' },
  ];

  const formattedData = interviews.map(interview => ({
    applicantName: interview.application?.applicant_name || '-',
    jobTitle: interview.application?.job?.title || '-',
    applicationDate: fDate(interview.application?.created_at) || '-',
    joiningDate: fDate(interview.created_at) || '-',
  }));

  generatePDF(formattedData, 'Selected Candidates Report', columns);
};

export const generateRejectedCandidatesPDF = (interviews, stage) => {
  const columns = [
    { header: 'Applicant Name', key: 'applicantName' },
    { header: 'Job Title', key: 'jobTitle' },
    { header: 'Interview Date', key: 'interviewDate' },
    { header: 'Interviewer', key: 'interviewer' },
    { header: 'Rejection Reason', key: 'rejectionReason' },
  ];

  const formattedData = interviews.map(interview => {
    let feedbackText = '-';
    try {
      if (interview.feedback) {
        const feedbackData = JSON.parse(interview.feedback);
        feedbackText = feedbackData.feedback || '-';
      }
    } catch (error) {
      feedbackText = interview.feedback || '-';
    }

    return {
      applicantName: interview.application?.applicant_name || '-',
      jobTitle: interview.application?.job?.title || '-',
      interviewDate: fDate(interview.schedule_date) || '-',
      interviewer: interview.interviewer || '-',
      rejectionReason: feedbackText,
    };
  });

  generatePDF(formattedData, `Rejected Candidates - ${stage} Round`, columns);
}; 