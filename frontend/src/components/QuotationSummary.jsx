import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Container,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as AccountBalanceIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { SERVICES } from '../lib/servicesData';

/**
 * QuotationSummary.jsx - Fixed Version with Proper Subservice Loading
 * - Properly loads and displays actual subservice names from servicesData.js
 * - Uses Material-UI for PDF-like preview layout
 * - Removes edit pricing and back to dashboard buttons
 * - Changes "create new quotation" to "complete quotation" with dashboard redirect
 * - Shows individual pricing next to service names, total at bottom
 */

const slugify = (str = '') => String(str)
  .toLowerCase()
  .trim()
  .replace(/[\s_]+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-');

const ensureUniqueId = (base, used) => {
  if (!base) base = `id-${Math.random().toString(36).slice(2, 8)}`;
  let id = base;
  let i = 1;
  while (used.has(id)) {
    id = `${base}-${i++}`;
  }
  used.add(id);
  return id;
};

// Helper function to find service by ID in servicesData
const findServiceById = (serviceId) => {
  for (const headerName in SERVICES) {
    const services = SERVICES[headerName];
    for (const service of services) {
      if (service.id === serviceId) {
        return service;
      }
    }
  }
  return null;
};

// Helper function to find service by name
const findServiceByName = (serviceName) => {
  for (const headerName in SERVICES) {
    const services = SERVICES[headerName];
    for (const service of services) {
      if (service.name === serviceName) {
        return service;
      }
    }
  }
  return null;
};

const normalizeQuotation = (raw) => {
  const usedIds = new Set();
  const normalized = { ...raw };
  
  const headers = Array.isArray(raw.headers) ? raw.headers : [];
  normalized.headers = headers.map((header, hIndex) => {
    const headerName = header?.name || header?.header || `Header ${hIndex + 1}`;
    const baseHeaderId = header?.id || `header-${slugify(headerName)}` || `header-${hIndex}`;
    const headerId = ensureUniqueId(baseHeaderId, usedIds);

    const services = Array.isArray(header.services) ? header.services : [];
    const normalizedServices = services.map((service, sIndex) => {
      const serviceName = service?.name || service?.label || service?.title || `Service ${sIndex + 1}`;
      const baseServiceId = service?.id || `${headerId}-service-${slugify(serviceName)}` || `${headerId}-service-${sIndex}`;
      const serviceId = ensureUniqueId(baseServiceId, usedIds);

      // Try to find the actual service data from servicesData.js
      let actualServiceData = null;
      if (service?.id) {
        actualServiceData = findServiceById(service.id);
      }
      if (!actualServiceData && serviceName) {
        actualServiceData = findServiceByName(serviceName);
      }

      let normalizedSubServices = [];
      
      if (actualServiceData && actualServiceData.subServices) {
        // Use the actual subservices from servicesData.js
        normalizedSubServices = actualServiceData.subServices.map((sub) => ({
          id: sub.id,
          name: sub.name
        }));
      } else {
        // Fallback to the subservices from the API data if available
        const rawSubServices = Array.isArray(service.subServices) ? service.subServices : [];
        normalizedSubServices = rawSubServices.map((sub, subIndex) => {
          if (typeof sub === 'string') {
            const name = sub;
            const baseSubId = `${serviceId}-sub-${slugify(name)}` || `${serviceId}-sub-${subIndex}`;
            const subId = ensureUniqueId(baseSubId, usedIds);
            return { id: subId, name };
          }

          const subName = sub?.name || sub?.label || sub?.title || `Sub ${subIndex + 1}`;
          const baseSubId = sub?.id || `${serviceId}-sub-${slugify(subName)}` || `${serviceId}-sub-${subIndex}`;
          const subId = ensureUniqueId(baseSubId, usedIds);
          return { id: subId, name: subName };
        });
      }

      return {
        id: serviceId,
        name: serviceName,
        subServices: normalizedSubServices,
        price: service?.price || 0
      };
    });

    return {
      id: headerId,
      name: headerName,
      services: normalizedServices
    };
  });

  return normalized;
};

const QuotationSummary = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/quotations/${id}`);
        if (!response.ok) throw new Error('Failed to fetch quotation');
        
        const payload = await response.json();
        const rawData = payload?.data || payload || {};
        
        const normalized = normalizeQuotation(rawData);
        console.log('Normalized quotation with actual subservices:', normalized);
        setQuotation(normalized);
      } catch (err) {
        console.error('Error fetching quotation:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchQuotation();
  }, [id]);

  const handleDownload = () => {
    if (!quotation) return;

    const quotationData = {
      id: quotation.id,
      projectDetails: {
        developerName: quotation.developerName,
        projectName: quotation.projectName,
        developerType: quotation.developerType,
        projectRegion: quotation.projectRegion,
        plotArea: quotation.plotArea,
        validity: quotation.validity,
        paymentSchedule: quotation.paymentSchedule,
        reraNumber: quotation.reraNumber
      },
      services: quotation.headers?.map(h => ({
        id: h.id,
        name: h.name,
        services: h.services?.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          subServices: s.subServices?.map(ss => ({
            id: ss.id,
            name: ss.name
          })) || []
        })) || []
      })) || [],
      pricing: quotation.pricingBreakdown || [],
      totalAmount: quotation.totalAmount || 0,
      createdAt: quotation.createdAt
    };

    const blob = new Blob([JSON.stringify(quotationData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotation-${quotation.id || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCompleteQuotation = () => {
    navigate('/dashboard');
  };

  const calculateTotalAmount = () => {
    if (!quotation?.headers) return 0;
    
    return quotation.headers.reduce((total, header) => {
      return total + header.services.reduce((headerTotal, service) => {
        return headerTotal + (service.price || 0);
      }, 0);
    }, 0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error loading quotation: {error}
        </Alert>
      </Box>
    );
  }

  if (!quotation) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          No quotation data available
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#fafbff', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
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
              QUOTATION SUMMARY
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

          {/* Services Section */}
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
              quotation.headers.map((header) => (
                <Box key={header.id} sx={{ mb: 3 }}>
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
                    {header.name}
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
                                {service.name}
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
                                          primary={subService.name}
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
                                {(service.price || 0).toLocaleString()}
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
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', ml: 2 }}>
                    No services selected for this category
                  </Typography>
                )}
              </Box>
            ))
          ) : (
            <Alert severity="info">
              No services selected
            </Alert>
          )}
          </Box>

          {/* Total Amount Section */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2, 
            backgroundColor: '#f0f7ff', 
            border: '1px solid #1976d2',
            borderRadius: 1,
            mb: 3
          }}>
            <Typography variant="h6" fontWeight="bold" color="primary">
              Total Amount:
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              ₹{(quotation.totalAmount || calculateTotalAmount()).toLocaleString()}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              size="large"
              sx={{
                borderColor: '#1976d2',
                color: '#1976d2',
                '&:hover': {
                  backgroundColor: '#f0f7ff',
                  borderColor: '#1976d2'
                }
              }}
            >
              Download Quotation
            </Button>
            
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={handleCompleteQuotation}
              size="large"
              sx={{ 
                px: 4,
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0'
                }
              }}
            >
              Complete Quotation
            </Button>
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
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default QuotationSummary;