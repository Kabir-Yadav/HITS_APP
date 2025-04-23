import { useState } from 'react';
import { format } from 'date-fns';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import {
  Page,
  Text,
  View,
  Font,
  Image,
  Document,
  StyleSheet,
} from '@react-pdf/renderer';

import { Card, CardContent, Stack, Box, Typography, Divider, Button } from '@mui/material';

const stylesLOR = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 8,
    fontFamily: 'Times-Roman',
  },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    width: '30%',
  },
  headerRight: {
    width: '70%',
    alignItems: 'flex-end',  
  },
  logo: {
    width: 120,
    height: 'auto',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'right',
    fontFamily: 'Times-Roman',
  },
  companyDetails: {
    fontSize: 8,
    marginBottom: 2,
    textAlign: 'right',
    fontFamily: 'Times-Roman',
  },
  letterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
    textDecoration: 'underline',
    fontFamily: 'Times-Roman',
  },
  date: {
    fontSize: 10,
    marginBottom: 10,
    textAlign: 'right',
    marginRight: 2,
    fontFamily: 'Times-Roman',
  },
  content: {
    marginBottom: 5,
  },
  paragraph: {
    marginBottom: 2,
    lineHeight: 1,
    textAlign: 'justify',
    fontFamily: 'Times-Roman',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 5,
    fontSize: 10,
    fontFamily: 'Times-Bold',
    textDecoration: 'underline',
  },
  signature: {
    marginTop: 8,
    fontFamily: 'Times-Roman',
  },
  signatureName: {
    marginTop: 50,
    fontWeight: 'bold',
    fontFamily: 'Times-Roman',
  },
  signatureTitle: {
    fontSize: 10,
    fontFamily: 'Times-Roman',
  },
});

export function LORPDFDocument({ lor }) {
  // Split the intern name into first and last name
  const [firstName, lastName] = (lor?.intern_name || "Prerna Khandelwal").split(' ');
  const issueDate = lor?.issue_date ? format(new Date(lor.issue_date), 'MMMM dd, yyyy') : "April 04, 2025";

  return (
    <Document>
      <Page size="A4" style={stylesLOR.page}>
        {/* Header with logo and company info */}
        <View style={stylesLOR.header}>
          <View style={stylesLOR.headerLeft}>
            <Image 
              src="/assets/F13-logo-new.png"
              style={stylesLOR.logo}
            />
          </View>
          <View style={stylesLOR.headerRight}>
            <Text style={stylesLOR.companyName}>FXIII ENHANCE PRIVATE LIMITED</Text>
            <Text style={stylesLOR.companyDetails}>Regd. Add: 47, Rao Harnath Marg,</Text>
            <Text style={stylesLOR.companyDetails}>Kapashera, New Delhi-110037</Text>
            <Text style={stylesLOR.companyDetails}>CIN: U72900DL2018PTC337917</Text>
            <Text style={stylesLOR.companyDetails}>GSTIN: 07AADCF4775B1ZS</Text>
            <Text style={stylesLOR.companyDetails}>Website:www.f13.tech | Email:info@f13.tech</Text>
          </View>
        </View>
        
        <Text style={stylesLOR.date}>{issueDate}</Text>
        
        <Text style={stylesLOR.letterTitle}>LETTER OF RECOMMENDATION</Text>

        <View style={stylesLOR.content}>
          <Text style={stylesLOR.paragraph}>
            I am writing to express my strongest recommendation for {firstName} {lastName}, who recently completed a research
            internship under my supervision at F13 Technologies. Throughout her internship, {firstName} consistently
            demonstrated exceptional research skills and a profound dedication to her work.
          </Text>
          
          <Text style={stylesLOR.paragraph}>
            {firstName} possesses a remarkable ability to grasp complex concepts, design and execute rigorous tasks, analyse
            and interpret data with proficiency. HIs independent research on a critical aspect of the project, development of a
            novel methodology that significantly improved efficiency and significantly advanced our research efforts.
          </Text>
          
          <Text style={stylesLOR.sectionTitle}>Exemplary Teamwork and Collaboration</Text>
          <Text style={stylesLOR.paragraph}>
            {firstName} is not only an accomplished researcher but also a valuable team member. She fosters a collaborative and
            productive environment by specific examples of teamwork, e.g., effectively communicating research findings to
            both technical and non-technical audiences, readily assisting colleagues with troubleshooting and
            problem-solving, offering insightful suggestions that demonstrably improve the research process. Her positive
            personality traits relevant to research, intellectual curiosity, unwavering work ethic, and a commitment to
            excellence are truly commendable.
          </Text>
          
          <Text style={stylesLOR.sectionTitle}>Significant Contribution</Text>
          <Text style={stylesLOR.paragraph}>
            {firstName} played a critical role in conducting research for various events for the general public. Her contribution to
            our research project was nothing short of transformative. She unearthed a previously unknown research avenue,
            spearheaded the development of a groundbreaking research methodology, and played a pivotal role in achieving
            groundbreaking results. Undoubtedly hIs work has the potential to leave an indelible mark on the field.
          </Text>
          
          <Text style={stylesLOR.sectionTitle}>Capabilities</Text>
          <Text style={stylesLOR.paragraph}>
            Beyond technical prowess, {firstName} brought an infectious collaborative spirit, relentless work ethic, and an
            insatiable thirst for knowledge to our research team. She consistently impressed me with their eagerness to
            master new techniques, unwavering perseverance in the face of challenges, and an exceptional ability to
            collaborate effectively.
          </Text>
          
          <Text style={stylesLOR.sectionTitle}>Unqualified Professional Endorsement</Text>
          <Text style={stylesLOR.paragraph}>
            Without any reservations, {firstName} {lastName} has my unqualified professional endorsement for any future
            endeavours. She is a prodigiously talented and remarkably motivated individual who would be an invaluable
            asset to any team. Her intellectual prowess, technical skills, and persistent dedication make them a highly
            sought-after asset to any team. Her ability to learn independently, adapt to new challenges with a
            solutions-oriented approach, and consistently deliver impactful results is truly exceptional.
          </Text>
          
          <Text style={stylesLOR.paragraph}>
            {firstName} {lastName} has my deepest personal respect which extends far beyond their professional capabilities.
            She is an individual of unwavering integrity, genuine humility, and an everlasting passion. I have absolutely no
            reservations in stating that they are destined for exceptional achievements in their chosen field.
        </Text>
          
          <Text style={stylesLOR.paragraph}>
            You may get in touch if you require any further information.
        </Text>
        </View>

        <View style={stylesLOR.signature}>
          <Text>Sincerely,</Text>
          <Text style={stylesLOR.signatureName}>Amanpreet Singh</Text>
          <Text style={stylesLOR.signatureTitle}>Founder & Director</Text>
        </View>
      </Page>
    </Document>
  );
}

// For the download component, we can keep the existing implementation
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
            <Box sx={{ height: '80vh', width: '100%' }}>
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