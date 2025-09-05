import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as AccountBalanceIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Print as PrintIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

const QuotationView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem("token");

  // Function to generate dynamic terms based on quotation data
  const generateDynamicTerms = (quotationData) => {
    const dynamicTerms = [];
    
    if (quotationData) {
      // 1. Quotation validity term
      const validity = quotationData.validity || quotationData.validityPeriod;
      if (validity) {
        const validityString = validity.toString().toLowerCase();
        let validityDays = 0;
        
        if (validityString.includes('7')) {
          validityDays = 7;
        } else if (validityString.includes('15')) {
          validityDays = 15;
        } else if (validityString.includes('30')) {
          validityDays = 30;
        } else {
          const matches = validityString.match(/\d+/);
          if (matches) {
            validityDays = parseInt(matches[0]);
          }
        }
        
        if (validityDays > 0) {
          const baseDate = quotationData.createdAt ? new Date(quotationData.createdAt) : new Date();
          const validUntilDate = new Date(baseDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
          
          const formattedDate = validUntilDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          
          dynamicTerms.push(`The quotation is valid upto ${formattedDate}.`);
        }
      }
      
      // 2. Advance payment term
      const paymentSchedule = quotationData.paymentSchedule || quotationData.payment_schedule;
      if (paymentSchedule) {
        dynamicTerms.push(`${paymentSchedule} of the total amount must be paid in advance before commencement of work/service.`);
      }
    }
    
    return dynamicTerms;
  };

  // Function to get all applicable terms
  const getApplicableTerms = (quotationData) => {
    const dynamicTerms = generateDynamicTerms(quotationData);
    
    const allTerms = {
      "General T&C": [
        ...dynamicTerms,
        "The above quotation is subject to this project only.",
        "The prices mentioned above are in particular to One Project per year.",
        "The services outlined above are included within the project scope. Any additional services not specified are excluded from this scope.",
        "The prices mentioned above are applicable to One Project only for the duration of the services obtained.",
        "The prices mentioned above DO NOT include Government Fees.",
        "The prices mentioned above DO NOT include Edit Fees.",
        "*18% GST Applicable on above mentioned charges.",
        "The prices listed above do not include any applicable statutory taxes.",
        "Any and all services not mentioned in the above scope of services are not applicable",
        "All Out-of-pocket expenses incurred for completion of the work shall be re-imbursed to RERA Easy"
      ],
      "Package A,B,C": [
        "Payment is due at the initiation of services, followed by annual payments thereafter.",
        "Any kind of drafting of legal documents or contracts are not applicable.",
        "The quoted fee covers annual MahaRERA compliance services, with billing on a Yearly basis for convenience and predictable financial planning.",
        "Invoices will be generated at a predetermined interval for each year in advance.",
        "The initial invoice will be issued from the date of issuance or a start date as specified in the Work Order."
      ],
      "Package D": [
        "All Out-of-pocket expenses incurred for the explicit purpose of Commuting, Refreshment meals of RERA Easy's personnel shall be re-imbursed to RERA Easy, subject to submission of relevant invoices, bills and records submitted."
      ]
    };

    // Service to terms mapping
    const serviceTermsMapping = {
      "Package A": "Package A,B,C",
      "Package B": "Package A,B,C", 
      "Package C": "Package A,B,C",
      "Package D": "Package D"
    };

    const applicableTermsSets = new Set(['General T&C']);
    
    if (quotationData?.headers) {
      quotationData.headers.forEach(header => {
        header.services?.forEach(service => {
          const termCategory = serviceTermsMapping[service.name];
          if (termCategory) {
            applicableTermsSets.add(termCategory);
          }
        });
      });
    }

    // Include custom terms if they exist
    if (quotationData?.customTerms && quotationData.customTerms.length > 0) {
      allTerms["Custom Terms"] = quotationData.customTerms;
      applicableTermsSets.add("Custom Terms");
    }

    const result = {};
    applicableTermsSets.forEach(category => {
      if (allTerms[category]) {
        result[category] = allTerms[category];
      }
    });

    return result;
  };

  useEffect(() => {
    const fetchQuotationAndPricing = async () => {
      try {
        setLoading(true);
        
        // Fetch basic quotation data
        const quotationResponse = await fetch(`http://localhost:3001/api/quotations/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!quotationResponse.ok) {
          throw new Error('Failed to fetch quotation');
        }
        
        const quotationResult = await quotationResponse.json();
        const quotationData = quotationResult.data || quotationResult;
        
        setQuotation(quotationData);
        
        // Fetch pricing data
        try {
          const pricingResponse = await fetch(
            "http://localhost:3001/api/quotations/calculate-pricing",
            {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                developerType: quotationData.developerType,
                projectRegion: quotationData.projectRegion,
                plotArea: quotationData.plotArea,
                headers: quotationData.headers || [],
              }),
            }
          );
          
          if (pricingResponse.ok) {
            const pricingResult = await pricingResponse.json();
            setPricingData(pricingResult);
          }
        } catch (pricingErr) {
          // Pricing data is optional, continue without it
        }
        
      } catch (err) {
        console.error('Error fetching quotation:', err);
        setError(err.message || 'Failed to load quotation');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchQuotationAndPricing();
    }
  }, [id, token]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper function to get service price from pricing data or fallback
  const getServicePrice = (service, headerIndex, serviceIndex) => {
    // First try to get price from pricing data if available
    if (pricingData?.breakdown && pricingData.breakdown[headerIndex]?.services[serviceIndex]) {
      const pricingService = pricingData.breakdown[headerIndex].services[serviceIndex];
      return pricingService.finalAmount || pricingService.totalAmount || 0;
    }
    
    // Fallback to various possible price field names from quotation data
    return service.price || service.amount || service.cost || service.totalPrice || service.servicePrice || 0;
  };

  const calculateTotalAmount = () => {
    // First try to use pricing data total if available
    if (pricingData?.breakdown) {
      return pricingData.breakdown.reduce((total, header) => {
        return total + (header.services || []).reduce((headerTotal, service) => {
          return headerTotal + (service.finalAmount || service.totalAmount || 0);
        }, 0);
      }, 0);
    }
    
    // Fallback to quotation total amount or calculated from services
    if (quotation?.totalAmount) {
      return quotation.totalAmount;
    }
    
    // Last fallback: calculate from quotation headers
    if (!quotation?.headers) return 0;
    
    return quotation.headers.reduce((total, header) => {
      return total + (header.services || []).reduce((headerTotal, service) => {
        const servicePrice = service.price || service.amount || service.cost || service.totalPrice || service.servicePrice || 0;
        return headerTotal + servicePrice;
      }, 0);
    }, 0);
  };

  // Excel-like table styles with white/blue theme
  const excelTableStyles = {
    '& .MuiTableContainer-root': {
      border: '1px solid #e3f2fd',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(25,118,210,0.1)'
    },
    '& .MuiTable-root': {
      borderCollapse: 'separate',
      borderSpacing: 0,
    },
    '& .MuiTableHead-root': {
      '& .MuiTableCell-root': {
        backgroundColor: '#1976d2',
        color: 'white',
        borderRight: '1px solid rgba(255,255,255,0.2)',
        borderBottom: 'none',
        padding: '12px 16px',
        fontSize: '0.9rem',
        fontWeight: 600,
        '&:last-child': {
          borderRight: 'none',
        },
      },
    },
    '& .MuiTableBody-root': {
      '& .MuiTableRow-root': {
        '&:nth-of-type(even)': {
          backgroundColor: '#f8faff',
        },
        '&:hover': {
          backgroundColor: '#e3f2fd',
        },
        '& .MuiTableCell-root': {
          borderRight: '1px solid #e3f2fd',
          borderBottom: '1px solid #e3f2fd',
          padding: '10px 16px',
          fontSize: '0.85rem',
          color: '#1a1a1a',
          '&:last-child': {
            borderRight: 'none',
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading quotation: {error}
        </Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!quotation) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Quotation not found
        </Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const applicableTerms = getApplicableTerms(quotation);
  const totalAmount = quotation.totalAmount || calculateTotalAmount();

  return (
    <Box sx={{ backgroundColor: '#fafbff', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Header with Actions */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2, 
          p: 2,
          backgroundColor: 'white',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          '@media print': { display: 'none' } 
        }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ 
              textTransform: 'none',
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': {
                backgroundColor: '#f0f7ff',
                borderColor: '#1976d2'
              }
            }}
          >
            Back to Dashboard
          </Button>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ 
                textTransform: 'none',
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0'
                }
              }}
            >
              Print
            </Button>
          </Stack>
        </Box>

        {/* Main Content */}
        <Paper elevation={2} sx={{ p: 3, backgroundColor: 'white', borderRadius: 2 }}>
          {/* Document Header */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: 3, 
            p: 3,
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: 'white',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
          }}>
            <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              QUOTATION
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mt: 2,
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                ID: {quotation.id}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {new Date().toLocaleDateString('en-GB')}
              </Typography>
            </Box>
          </Box>

          {/* Project Details Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center',
              color: '#1976d2',
              borderBottom: '2px solid #e3f2fd',
              pb: 1
            }}>
              <BusinessIcon sx={{ mr: 1 }} />
              Project Information
            </Typography>
          
          {/* Single Unified Project Information Table */}
          <TableContainer component={Paper} sx={{ ...excelTableStyles }}>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '20%', backgroundColor: '#e3f2fd' }}>Developer Name</TableCell>
                  <TableCell sx={{ width: '30%' }}>{quotation.developerName || 'N/A'}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '20%', backgroundColor: '#e3f2fd' }}>Project Name</TableCell>
                  <TableCell sx={{ width: '30%' }}>{quotation.projectName || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>Developer Type</TableCell>
                  <TableCell>{quotation.developerType || 'N/A'}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>Project Region</TableCell>
                  <TableCell>{quotation.projectRegion || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>Promoter Name</TableCell>
                  <TableCell>{quotation.promoterName || 'N/A'}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>Plot Area</TableCell>
                  <TableCell>{quotation.plotArea || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>RERA Number</TableCell>
                  <TableCell>{quotation.reraNumber || 'N/A'}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>Validity</TableCell>
                  <TableCell>{quotation.validity || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>Payment Schedule</TableCell>
                  <TableCell colSpan={3}>{quotation.paymentSchedule || 'N/A'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

          {/* Services and Pricing Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center',
              color: '#1976d2',
              borderBottom: '2px solid #e3f2fd',
              pb: 1
            }}>
              <AssignmentIcon sx={{ mr: 1 }} />
              Selected Services & Pricing
            </Typography>

            {quotation.headers && quotation.headers.length > 0 ? (
              quotation.headers.map((header, headerIndex) => (
                <Box key={header.id || headerIndex} sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      p: 2, 
                      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', 
                      color: 'white', 
                      borderRadius: 2,
                      fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(25,118,210,0.3)'
                    }}
                  >
                    {header.name || header.header || `Service Category ${headerIndex + 1}`}
                  </Typography>

                <TableContainer component={Paper} sx={{ ...excelTableStyles, mb: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '50%' }}>Service Name</TableCell>
                        <TableCell>Sub-Services</TableCell>
                        <TableCell align="right" sx={{ width: '20%' }}>Price (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {header.services && header.services.length > 0 ? (
                        header.services.map((service, serviceIndex) => (
                          <TableRow key={service.id || serviceIndex}>
                            <TableCell sx={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                              {service.name || service.serviceName || `Service ${serviceIndex + 1}`}
                            </TableCell>
                            <TableCell sx={{ verticalAlign: 'top' }}>
                              {service.subServices && service.subServices.length > 0 ? (
                                <List dense sx={{ py: 0 }}>
                                  {service.subServices.map((subService, subIndex) => (
                                    <ListItem key={subService.id || subIndex} sx={{ py: 0.25, pl: 0 }}>
                                      <ListItemIcon sx={{ minWidth: 20 }}>
                                        <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                      </ListItemIcon>
                                      <ListItemText 
                                        primary={subService.name || subService}
                                        sx={{ my: 0 }}
                                        primaryTypographyProps={{ fontSize: '0.8rem' }}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              ) : (
                                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                  No sub-services
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                              {getServicePrice(service, headerIndex, serviceIndex).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              No services selected for this category
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No services selected for this quotation
            </Alert>
          )}

          {/* Total Amount Section */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2, 
            backgroundColor: '#f0f7ff', 
            border: '1px solid #1976d2',
            borderRadius: 1
          }}>
            <Typography variant="h6" fontWeight="bold" color="primary">
              Total Amount:
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              ₹{totalAmount.toLocaleString()}
            </Typography>
          </Box>
        </Box>

          {/* Terms and Conditions Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ 
              mb: 2,
              color: '#1976d2',
              borderBottom: '2px solid #e3f2fd',
              pb: 1
            }}>
              Terms & Conditions
            </Typography>

            {Object.keys(applicableTerms).length > 0 ? (
              Object.entries(applicableTerms).map(([category, terms]) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 1.5, 
                      p: 2, 
                      background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)', 
                      color: 'white',
                      borderRadius: 2,
                      fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(255,152,0,0.3)'
                    }}
                  >
                    {category}
                  </Typography>
                
                <List dense>
                  {terms.map((term, index) => (
                    <ListItem key={index} sx={{ py: 0.5, pl: 0 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {index + 1}.
                        </Typography>
                      </ListItemIcon>
                      <ListItemText 
                        primary={term}
                        primaryTypographyProps={{ 
                          fontSize: '0.9rem',
                          lineHeight: 1.4
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))
          ) : (
            <Alert severity="info">
              No specific terms and conditions applicable for this quotation.
            </Alert>
          )}
        </Box>

          {/* Footer */}
          <Box sx={{ 
            textAlign: 'center', 
            pt: 3, 
            mt: 2,
            borderTop: '2px solid #e3f2fd',
            color: 'text.secondary',
            backgroundColor: '#f8faff',
            borderRadius: 2,
            p: 2
          }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              This is a computer-generated quotation and does not require a signature.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2, mb: 1 }}>
              <Typography variant="body2">Generated: {new Date().toLocaleDateString('en-GB')}</Typography>
              <Typography variant="body2">ID: {quotation.id}</Typography>
              <Typography variant="body2">Status: {quotation.status?.toUpperCase() || 'DRAFT'}</Typography>
            </Box>
            {quotation.createdBy && (
              <Typography variant="body2">
                Created by: {quotation.createdBy}
              </Typography>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default QuotationView;
