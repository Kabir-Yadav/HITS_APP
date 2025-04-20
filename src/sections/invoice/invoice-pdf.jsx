import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Page,
  Text,
  View,
  Font,
  Image,
  Document,
  PDFViewer,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';



// ----------------------------------------------------------------------

export function InvoicePDFDownload({ invoice, currentStatus }) {
  const renderButton = (loading) => (
    <Tooltip title="Download">
      <IconButton>
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          <Iconify icon="eva:cloud-download-fill" />
        )}
      </IconButton>
    </Tooltip>
  );

  return (
    <PDFDownloadLink
      document={<InvoicePdfDocument invoice={invoice} currentStatus={currentStatus} />}
      fileName={invoice?.invoiceNumber}
      style={{ textDecoration: 'none' }}
    >
      {/* @ts-expect-error: https://github.com/diegomura/react-pdf/issues/2886 */}
      {({ loading }) => renderButton(loading)}
    </PDFDownloadLink>
  );
}

// ----------------------------------------------------------------------

export function InvoicePDFViewer({ invoice, currentStatus }) {
  return (
    <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
      <InvoicePdfDocument invoice={invoice} currentStatus={currentStatus} />
    </PDFViewer>
  );
}

// ----------------------------------------------------------------------

Font.register({
  family: 'Roboto',
  // fonts from public folder
  fonts: [{ src: '/fonts/Roboto-Regular.ttf' }, { src: '/fonts/Roboto-Bold.ttf' }],
});

const useStyles = () =>
  useMemo(
    () =>
      StyleSheet.create({
        // layout
        page: {
          fontSize: 9,
          lineHeight: 1.6,
          fontFamily: 'Roboto',
          backgroundColor: '#FFFFFF',
          padding: '40px 24px 120px 24px',
        },
        footer: {
          left: 0,
          right: 0,
          bottom: 0,
          padding: 24,
          margin: 'auto',
          borderTopWidth: 1,
          borderStyle: 'solid',
          position: 'absolute',
          borderColor: '#e9ecef',
        },
        container: { flexDirection: 'row', justifyContent: 'space-between' },
        // margin
        mb4: { marginBottom: 4 },
        mb8: { marginBottom: 8 },
        mb40: { marginBottom: 40 },
        // text
        h3: { fontSize: 16, fontWeight: 700, lineHeight: 1.2 },
        h4: { fontSize: 12, fontWeight: 700 },
        text1: { fontSize: 10 },
        text2: { fontSize: 9 },
        text1Bold: { fontSize: 10, fontWeight: 700 },
        text2Bold: { fontSize: 9, fontWeight: 700 },
        // table
        table: { display: 'flex', width: '100%' },
        row: {
          padding: '10px 0 8px 0',
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderStyle: 'solid',
          borderColor: '#e9ecef',
        },
        cell_1: { width: '5%' },
        cell_2: { width: '50%' },
        cell_3: { width: '15%', paddingLeft: 32 },
        cell_4: { width: '15%', paddingLeft: 8 },
        cell_5: { width: '15%' },
        noBorder: { paddingTop: '10px', paddingBottom: 0, borderBottomWidth: 0 },
      }),
    []
  );

function InvoicePdfDocument({ invoice, currentStatus }) {
  const {
    items,
    taxes,
    dueDate,
    discount,
    shipping,
    subtotal,
    invoiceTo,
    createDate,
    totalAmount,
    invoiceFrom,
    invoiceNumber,
  } = invoice ?? {};

  const styles = useStyles();

  const renderHeader = () => (
    <View style={[styles.container, styles.mb40]}>
      <Image source="/logo/logo-single.png" style={{ width: 48, height: 48 }} />

      <View style={{ alignItems: 'flex-end', flexDirection: 'column' }}>
        <Text style={[styles.h3, styles.mb8, { textTransform: 'capitalize' }]}>
          {currentStatus}
        </Text>
        <Text style={[styles.text2]}>{invoiceNumber}</Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={[styles.container, styles.footer]} fixed>
      <View style={{ width: '75%' }}>
        <Text style={[styles.text2Bold, styles.mb4]}>NOTES</Text>
        <Text style={[styles.text2]}>
          We appreciate your business. Should you need us to add VAT or extra notes let us know!
        </Text>
      </View>
      <View style={{ width: '25%', textAlign: 'right' }}>
        <Text style={[styles.text2Bold, styles.mb4]}>Have a question?</Text>
        <Text style={[styles.text2]}>support@abcapp.com</Text>
      </View>
    </View>
  );

  const renderBillingInfo = () => (
    <View style={[styles.container, styles.mb40]}>
      <View style={{ width: '50%' }}>
        <Text style={[styles.text1Bold, styles.mb4]}>Invoice from</Text>
        <Text style={[styles.text2]}>{invoiceFrom?.name}</Text>
        <Text style={[styles.text2]}>{invoiceFrom?.fullAddress}</Text>
        <Text style={[styles.text2]}>{invoiceFrom?.phoneNumber}</Text>
      </View>

      <View style={{ width: '50%' }}>
        <Text style={[styles.text1Bold, styles.mb4]}>Invoice to</Text>
        <Text style={[styles.text2]}>{invoiceTo?.name}</Text>
        <Text style={[styles.text2]}>{invoiceTo?.fullAddress}</Text>
        <Text style={[styles.text2]}>{invoiceTo?.phoneNumber}</Text>
      </View>
    </View>
  );

  const renderDates = () => (
    <View style={[styles.container, styles.mb40]}>
      <View style={{ width: '50%' }}>
        <Text style={[styles.text1Bold, styles.mb4]}>Date create</Text>
        <Text style={[styles.text2]}>{fDate(createDate)}</Text>
      </View>
      <View style={{ width: '50%' }}>
        <Text style={[styles.text1Bold, styles.mb4]}>Due date</Text>
        <Text style={[styles.text2]}>{fDate(dueDate)}</Text>
      </View>
    </View>
  );

  const renderTable = () => (
    <>
      <Text style={[styles.text1Bold]}>Invoice details</Text>

      <View style={styles.table}>
        <View>
          <View style={styles.row}>
            <View style={styles.cell_1}>
              <Text style={[styles.text2Bold]}>#</Text>
            </View>
            <View style={styles.cell_2}>
              <Text style={[styles.text2Bold]}>Description</Text>
            </View>
            <View style={styles.cell_3}>
              <Text style={[styles.text2Bold]}>Qty</Text>
            </View>
            <View style={styles.cell_4}>
              <Text style={[styles.text2Bold]}>Unit price</Text>
            </View>
            <View style={[styles.cell_5, { textAlign: 'right' }]}>
              <Text style={[styles.text2Bold]}>Total</Text>
            </View>
          </View>
        </View>

        <View>
          {items?.map((item, index) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.cell_1}>
                <Text>{index + 1}</Text>
              </View>
              <View style={styles.cell_2}>
                <Text style={[styles.text2Bold]}>{item.title}</Text>
                <Text style={[styles.text2]}>{item.description}</Text>
              </View>
              <View style={styles.cell_3}>
                <Text style={[styles.text2]}>{item.quantity}</Text>
              </View>
              <View style={styles.cell_4}>
                <Text style={[styles.text2]}>{item.price}</Text>
              </View>
              <View style={[styles.cell_5, { textAlign: 'right' }]}>
                <Text style={[styles.text2]}>{fCurrency(item.price * item.quantity)}</Text>
              </View>
            </View>
          ))}

          {[
            { name: 'Subtotal', value: subtotal },
            { name: 'Shipping', value: -(shipping ?? 0) },
            { name: 'Discount', value: -(discount ?? 0) },
            { name: 'Taxes', value: taxes },
            { name: 'Total', value: totalAmount, styles: styles.h4 },
          ].map((item) => (
            <View key={item.name} style={[styles.row, styles.noBorder]}>
              <View style={styles.cell_1} />
              <View style={styles.cell_2} />
              <View style={styles.cell_3} />
              <View style={styles.cell_4}>
                <Text style={[item.styles ?? styles.text2]}>{item.name}</Text>
              </View>
              <View style={[styles.cell_5, { textAlign: 'right' }]}>
                <Text style={[item.styles ?? styles.text2]}>{fCurrency(item.value)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {renderHeader()}
        {renderBillingInfo()}
        {renderDates()}
        {renderTable()}
        {renderFooter()}
      </Page>
    </Document>
  );
}

// ----------------------------------------------------------------------

const stylesLOR = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  date: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'right',
  },
  content: {
    marginBottom: 20,
  },
  paragraph: {
    marginBottom: 10,
    lineHeight: 1.5,
  },
  signature: {
    marginTop: 50,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    width: 200,
    marginBottom: 5,
  },
});

export function LORPDFDocument({ lor }) {
  return (
    <Document>
      <Page size="A4" style={stylesLOR.page}>
        <View style={stylesLOR.header}>
          <Text style={stylesLOR.title}>Letter of Recommendation</Text>
          <Text style={stylesLOR.date}>{format(new Date(lor.issue_date), 'MMMM dd, yyyy')}</Text>
        </View>

        <View style={stylesLOR.content}>
          <Text style={stylesLOR.paragraph}>
            This letter is to certify that {lor.intern_name} has completed their internship successfully.
          </Text>

          <Text style={stylesLOR.paragraph}>
            We highly recommend {lor.intern_name} for future opportunities and believe they would be a valuable addition to any organization.
          </Text>
        </View>

        <View style={stylesLOR.signature}>
          <View style={stylesLOR.signatureLine} />
          <Text>Authorized Signatory</Text>
        </View>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------------------------

export function LORPDFDownload({ lor }) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Letter of Recommendation
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Preview and download the LOR in PDF format
            </Typography>
          </Box>

          <Divider />

          {showPreview && (
            <Box sx={{ height: '600px', mb: 3 }}>
              <PDFViewer width="100%" height="100%" style={{ border: '1px solid rgba(145, 158, 171, 0.16)' }}>
                <LORPDFDocument lor={lor} />
              </PDFViewer>
            </Box>
          )}

          <Stack direction="row" spacing={2}>
            <Button
              fullWidth
              color="primary"
              size="large"
              variant="outlined"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>

            <PDFDownloadLink
              document={<LORPDFDocument lor={lor} />}
              fileName={`LOR-${lor.intern_name}-${format(new Date(lor.issue_date), 'yyyy-MM-dd')}.pdf`}
              style={{ textDecoration: 'none', width: '100%' }}
            >
              {({ loading }) => (
                <Button
                  fullWidth
                  color="inherit"
                  size="large"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Generating PDF...' : 'Download PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
