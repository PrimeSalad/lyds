import { Button, Card, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const ImportHistoryPage = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <PageHeader
        title="Import History"
        description="Validate spreadsheet uploads before committing records."
        actions={(
          <Button colorPalette="green" onClick={() => navigate('/imports/new')}>
            New Import
          </Button>
        )}
      />
      <Card.Root borderColor="border" borderRadius="lg">
        <Card.Body py={10} textAlign="center">
          <Text fontFamily="heading" fontSize="lg" fontWeight="600" mb={2}>Bulk Import Records</Text>
          <Text color="gray.500" mb={6}>
            Quickly add multiple youth records by uploading a spreadsheet. 
            Supported formats include .xlsx and .csv.
          </Text>
          <Button colorPalette="green" onClick={() => navigate('/imports/new')}>
            Start New Import
          </Button>
        </Card.Body>
      </Card.Root>
    </DashboardLayout>
  );
};

export default ImportHistoryPage;
