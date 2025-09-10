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
  CircularProgress,
  Alert,
  Container
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { SERVICES } from '../lib/servicesData';

/**
 * QuotationSummary.jsx - Clean Layout Design
 * - Simple three-column layout: Service | Sub-services | Price
 * - Header name as page title
 * - Selected terms and conditions at bottom
 * - RERA Easy branding
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

const mergePricingData = (headers, pricingBreakdown) => {
  if (!pricingBreakdown || !Array.isArray(pricingBreakdown)) {
    return headers;
  }
  
  // Create maps for both service names and header names to prices
  const servicePriceMap = new Map();
  const headerPriceMap = new Map();
  
  pricingBreakdown.forEach(breakdown => {
    // Check if breakdown has a header name and total
    if (breakdown.name && (breakdown.totalAmount || breakdown.total)) {
      const headerPrice = breakdown.totalAmount || breakdown.total || 0;
      headerPriceMap.set(breakdown.name.trim(), headerPrice);
      console.log(`Found header price: ${breakdown.name} -> ${headerPrice}`);
    }
    
    if (breakdown.services && Array.isArray(breakdown.services)) {
      breakdown.services.forEach(service => {
        if (service.name) {
          // FIXED: Use finalAmount (edited price) if available, otherwise fallback to original amounts
          const price = service.finalAmount || service.totalAmount || service.price || service.amount || service.cost || 0;
          servicePriceMap.set(service.name.trim(), price);
          
          // Also try with normalized name (remove extra spaces, case insensitive)
          const normalizedName = service.name.replace(/\s+/g, ' ').trim();
          servicePriceMap.set(normalizedName, price);
          console.log(`Found service price: ${service.name} -> ${price} (finalAmount: ${service.finalAmount})`);
        }
      });
    }
  });
  
  console.log('Service Price Map:', Array.from(servicePriceMap.entries()));
  console.log('Header Price Map:', Array.from(headerPriceMap.entries()));
  
  // Apply prices to headers
  return headers.map(header => {
    // Check if the entire header is a package (like Package B)
    const headerName = header.name?.trim();
    let headerTotalPrice = headerPriceMap.get(headerName) || 0;
    
    const updatedServices = header.services?.map(service => {
      let price = service.price || service.totalAmount || service.amount || service.cost || 0;
      
      // If no price found, try to get from breakdown (which now includes edited prices)
      if (price === 0) {
        price = servicePriceMap.get(service.name) || 
                servicePriceMap.get(service.name?.trim()) ||
                servicePriceMap.get(service.name?.replace(/\s+/g, ' ').trim()) || 0;
      }
      
      // For packages, if individual service has no price but header has total, use header price
      if (price === 0 && headerTotalPrice > 0 && header.services?.length === 1) {
        price = headerTotalPrice;
      }
      
      console.log(`Mapping service '${service.name}' in header '${headerName}' -> Price: ${price}`);
      
      return {
        ...service,
        price: price
      };
    }) || [];
    
    return {
      ...header,
      services: updatedServices
    };
  });
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
  
  // Apply pricing data from breakdown if available
  if (raw.pricingBreakdown) {
    normalized.headers = mergePricingData(normalized.headers, raw.pricingBreakdown);
  }

  return normalized;
};

const QuotationSummary = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState([]);

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/quotations/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch quotation');
        
        const payload = await response.json();
        const rawData = payload?.data || payload || {};
        
        const normalized = normalizeQuotation(rawData);
        console.log('Normalized quotation with actual subservices:', normalized);
        console.log('Raw quotation data:', rawData);
        console.log('Raw pricing breakdown:', rawData.pricingBreakdown);
        console.log('Raw total amount:', rawData.totalAmount);
        
        // DEBUGGING: Check if edited prices are available
        if (rawData.pricingBreakdown && Array.isArray(rawData.pricingBreakdown)) {
          console.log('=== EDITED PRICING DEBUG ===');
          rawData.pricingBreakdown.forEach((breakdown, idx) => {
            console.log(`Breakdown ${idx}: ${breakdown.header || breakdown.name}`);
            if (breakdown.services && Array.isArray(breakdown.services)) {
              breakdown.services.forEach((service, sidx) => {
                console.log(`  Service ${sidx}: ${service.name}`);
                console.log(`    - totalAmount: ${service.totalAmount}`);
                console.log(`    - finalAmount: ${service.finalAmount}`);
                console.log(`    - Will use: ${service.finalAmount || service.totalAmount}`);
              });
            }
          });
          console.log('=== END EDITED PRICING DEBUG ===');
        }
        
        // Try to get pricing from pricingBreakdown if service prices are missing
        if (rawData.pricingBreakdown && Array.isArray(rawData.pricingBreakdown)) {
          console.log('Found pricing breakdown, attempting to match with services...');
          
          rawData.pricingBreakdown.forEach(breakdown => {
            console.log('Breakdown item:', breakdown);
            if (breakdown.services) {
              breakdown.services.forEach(pricedService => {
                console.log('Priced service:', pricedService.name, pricedService.totalAmount);
              });
            }
          });
        }
        
        // Debug pricing data
        if (normalized.headers) {
          normalized.headers.forEach(header => {
            console.log(`Header: ${header.name}`);
            if (header.services) {
              header.services.forEach(service => {
                console.log(`  Service: ${service.name}, Price: ${service.price}`);
              });
            }
          });
        }
        
        setQuotation(normalized);
        
        // Extract accepted terms from the quotation data
        const allAcceptedTerms = [];
        const termsCategories = new Map();
        
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
        
        // Define all possible terms and conditions
        const termsData = {
          "General T&C": [
            ...generateDynamicTerms(rawData),
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
        
        // Process applicable terms categories
        if (rawData.applicableTerms && Array.isArray(rawData.applicableTerms)) {
          rawData.applicableTerms.forEach(categoryName => {
            if (termsData[categoryName]) {
              termsCategories.set(categoryName, termsData[categoryName]);
              allAcceptedTerms.push(...termsData[categoryName]);
            }
          });
        }
        
        // Add custom terms
        if (rawData.customTerms && Array.isArray(rawData.customTerms)) {
          const filteredCustomTerms = rawData.customTerms.filter(term => term && term.trim());
          if (filteredCustomTerms.length > 0) {
            termsCategories.set('Custom Terms', filteredCustomTerms);
            allAcceptedTerms.push(...filteredCustomTerms);
          }
        }
        
        console.log('Extracted terms:', allAcceptedTerms);
        setAcceptedTerms(allAcceptedTerms);
      } catch (err) {
        console.error('Error fetching quotation:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchQuotation();
  }, [id]);

  const handleDownload = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/quotations/${id}/download-pdf?summary=true`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download error:', e);
    }
  };

  const handleCompleteQuotation = () => {
    navigate('/dashboard');
  };

  const calculateTotalAmount = () => {
    // FIXED: First try to use stored totalAmount from pricing, then calculate from services
    if (quotation?.totalAmount) {
      return quotation.totalAmount;
    }
    
    // If pricing breakdown is available, use edited prices from there
    if (quotation?.pricingBreakdown && Array.isArray(quotation.pricingBreakdown)) {
      return quotation.pricingBreakdown.reduce((total, breakdown) => {
        if (breakdown.services && Array.isArray(breakdown.services)) {
          const headerTotal = breakdown.services.reduce((sum, service) => {
            // Use finalAmount (edited price) if available
            const servicePrice = service.finalAmount || service.totalAmount || service.price || service.amount || 0;
            return sum + servicePrice;
          }, 0);
          return total + headerTotal;
        }
        return total;
      }, 0);
    }
    
    // Fallback: calculate from header services
    if (!quotation?.headers) return 0;
    
    return quotation.headers.reduce((total, header) => {
      return total + header.services.reduce((headerTotal, service) => {
        return headerTotal + (service.price || 0);
      }, 0);
    }, 0);
  };

  const getPageTitle = () => {
    if (!quotation?.headers || quotation.headers.length === 0) return 'QUOTATION SUMMARY';
    // Use the first header name as the page title
    return quotation.headers[0].name?.toUpperCase() || 'QUOTATION SUMMARY';
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
    <Box sx={{ backgroundColor: '#ffffff', minHeight: '100vh', p: 3 }}>
      <Container maxWidth="lg">
        {/* Header with Logo and Title */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
          borderBottom: '2px solid #000',
          pb: 1
        }}>
          <Typography 
            variant="h4" 
            fontWeight="bold" 
            sx={{ 
              color: '#000',
              letterSpacing: '3px',
              fontSize: '2rem'
            }}
          >
            {getPageTitle()}
          </Typography>
          
          {/* RERA Easy Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src="/api/logo.png" 
              alt="RERA Easy Logo" 
              style={{ 
                height: '60px', 
                width: 'auto',
                marginRight: '8px'
              }} 
              onError={(e) => {
                // Fallback if PNG logo doesn't load, try JPG
                e.target.src = '/api/logo.jpg';
                e.target.onerror = () => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                };
              }}
            />
            <Box sx={{ 
              display: 'none',
              alignItems: 'center'
            }}>
              <Box sx={{ 
                backgroundColor: '#FFD700', 
                p: 1, 
                borderRadius: 1, 
                mr: 1,
                minWidth: 40,
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="body2" fontWeight="bold" sx={{ color: '#000' }}>
                  🏢
                </Typography>
              </Box>
              <Typography 
                variant="h5" 
                fontWeight="bold" 
                sx={{ 
                  color: '#FFD700',
                  fontFamily: 'serif'
                }}
              >
                RERA<span style={{ color: '#1976d2' }}>Easy</span>
                <sup style={{ fontSize: '0.6em' }}>®</sup>
              </Typography>
            </Box>
          </Box>
        </Box>


        {/* Main Services Table - All Headers and Services */}
        <Box sx={{ mt: 3, mb: 3 }}>
          {quotation.headers && quotation.headers.length > 0 ? (
            <>
              {console.log('All headers:', quotation.headers.map(h => h.name))}
              {quotation.headers.map((header, headerIndex) => {
                const services = header.services || [];
                console.log(`Header ${headerIndex}: ${header.name}, Services:`, services.map(s => s.name));
                
                // Check if this header is a package with its own total price
                const isPackage = header.name?.toLowerCase().includes('package');
                let packageTotalPrice = 0;
                
                // Try multiple ways to find package price
                if (isPackage) {
                  console.log(`\n=== DEBUG: Package ${header.name} Pricing ===`);
                  console.log('Raw quotation object:', quotation);
                  console.log('PricingBreakdown array:', quotation.pricingBreakdown);
                  console.log('Current header object:', header);
                  
                  // Method 1: Direct from pricingBreakdown by exact name match
                  if (quotation.pricingBreakdown && Array.isArray(quotation.pricingBreakdown)) {
                    quotation.pricingBreakdown.forEach((breakdown, index) => {
                      console.log(`Breakdown[${index}]:`, breakdown);
                      console.log(`  - name: '${breakdown.name}'`);
                      console.log(`  - totalAmount: ${breakdown.totalAmount}`);
                      console.log(`  - total: ${breakdown.total}`);
                      if (breakdown.services && Array.isArray(breakdown.services)) {
                        breakdown.services.forEach(s => {
                          console.log(`    Service: ${s.name}, finalAmount: ${s.finalAmount}, totalAmount: ${s.totalAmount}`);
                        });
                      }
                    });
                    
                    const packageBreakdown = quotation.pricingBreakdown.find(b => {
                      const breakdownName = (b.name || b.headerName || b.header || '').trim();
                      const headerName = (header.name || '').trim();
                      console.log(`Comparing '${breakdownName}' === '${headerName}':`, breakdownName === headerName);
                      return breakdownName === headerName;
                    });
                    
                    if (packageBreakdown) {
                      // FIXED: Use the sum of finalAmount from services if available (edited prices)
                      if (packageBreakdown.services && Array.isArray(packageBreakdown.services)) {
                        packageTotalPrice = packageBreakdown.services.reduce((sum, service) => {
                          const servicePrice = service.finalAmount || service.totalAmount || service.price || service.amount || 0;
                          return sum + servicePrice;
                        }, 0);
                        console.log(`Calculated package price from services finalAmount: ${packageTotalPrice}`);
                      } else {
                        // Fallback to header-level totals
                        packageTotalPrice = packageBreakdown.totalAmount || 
                                           packageBreakdown.total || 
                                           packageBreakdown.amount ||
                                           packageBreakdown.price || 0;
                        console.log(`Using header-level package price: ${packageTotalPrice}`);
                      }
                    }
                  }
                  
                  // Method 2: From header object itself  
                  if (!packageTotalPrice) {
                    const headerPrice = header.totalAmount || header.total || header.amount || header.price || 0;
                    if (headerPrice > 0) {
                      packageTotalPrice = headerPrice;
                      console.log(`Found price in header object: ${packageTotalPrice}`);
                    }
                  }
                  
                  // Method 3: Sum of services in package
                  if (!packageTotalPrice && services.length > 0) {
                    let sumPrice = 0;
                    services.forEach(service => {
                      const servicePrice = service.price || service.totalAmount || service.amount || service.cost || 0;
                      console.log(`Service '${service.name}' price: ${servicePrice}`);
                      if (servicePrice > 0) sumPrice += servicePrice;
                    });
                    if (sumPrice > 0) {
                      packageTotalPrice = sumPrice;
                      console.log(`Calculated from services sum: ${packageTotalPrice}`);
                    }
                  }
                  
                  // Method 4: Hardcoded fallbacks for known packages
                  if (!packageTotalPrice) {
                    const packageFallbacks = {
                      'Package A': 200000,
                      'Package B': 250000,
                      'Package C': 300000,
                      'Package D': 100000
                    };
                    
                    if (packageFallbacks[header.name]) {
                      packageTotalPrice = packageFallbacks[header.name];
                      console.log(`Using fallback price for ${header.name}: ${packageTotalPrice}`);
                    }
                  }
                  
                  console.log(`FINAL packageTotalPrice for ${header.name}: ${packageTotalPrice}`);
                  console.log('=== END DEBUG ===\n');
                }
                
                // Calculate total rows for all services in this header
                let allRows = [];
                
                // For packages without individual service prices, create a single row
                if (isPackage && packageTotalPrice > 0 && services.length === 1) {
                  const service = services[0];
                  const subServices = service.subServices && service.subServices.length > 0 ? service.subServices : [null];
                  
                  // Use package total as service price if service has no price
                  const servicePrice = service.price || service.totalAmount || service.amount || service.cost || packageTotalPrice;
                  
                  subServices.forEach((subService, subIndex) => {
                    allRows.push({
                      serviceIndex: 0,
                      subIndex,
                      isFirstSubService: subIndex === 0,
                      service: {...service, price: servicePrice},
                      subService,
                      subCount: subServices.length,
                      servicePrice
                    });
                  });
                } else {
                  // Normal service processing
                  services.forEach((service, serviceIndex) => {
                    const subServices = service.subServices && service.subServices.length > 0 ? service.subServices : [null];
                    const servicePrice = service.price || service.totalAmount || service.amount || service.cost || 0;
                    
                    subServices.forEach((subService, subIndex) => {
                      allRows.push({
                        serviceIndex,
                        subIndex,
                        isFirstSubService: subIndex === 0,
                        service,
                        subService,
                        subCount: subServices.length,
                        servicePrice
                      });
                    });
                  });
                }

                if (allRows.length === 0) return null;

                return (
                  <Box 
                    key={`header-${headerIndex}`} 
                    sx={{ 
                      mb: 4,
                      pageBreakAfter: 'always',
                      minHeight: '60vh'
                    }}
                  >
                    {/* Page break for new header section */}
                    {headerIndex > 0 && (
                      <Box sx={{ 
                        height: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 4
                      }}>
                        <Divider sx={{ width: '100%', borderBottom: '3px solid #000' }} />
                      </Box>
                    )}
                    
                    {/* Header Title for this section */}
                    {headerIndex > 0 && (
                      <Box sx={{ mb: 4 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          borderBottom: '2px solid #000',
                          pb: 2
                        }}>
                          <Typography 
                            variant="h4" 
                            fontWeight="bold" 
                            sx={{ 
                              color: '#000',
                              letterSpacing: '3px',
                              fontSize: '2rem'
                            }}
                          >
                            {header.name?.toUpperCase()}
                          </Typography>
                          
                          {/* RERA Easy Logo */}
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <img 
                              src="/api/logo.png" 
                              alt="RERA Easy Logo" 
                              style={{ 
                                height: '60px', 
                                width: 'auto'
                              }} 
                              onError={(e) => {
                                // Fallback to JPG if PNG fails
                                e.target.src = '/api/logo.jpg';
                                e.target.onerror = () => {
                                  e.target.style.display = 'none';
                                };
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    )}
                    
                    <TableContainer sx={{ border: '1px solid #000', boxShadow: 'none', backgroundColor: '#fff' }}>
                      <Table sx={{ 
                        borderCollapse: 'collapse',
                        width: '100%',
                        '& th, & td': {
                          border: '1px solid #000'
                        }
                      }}>
                        {/* Table Header */}
                        <thead>
                          <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                            <TableCell sx={{ 
                              border: '1px solid #000', 
                              padding: '12px 16px', 
                              fontWeight: 'bold', 
                              fontSize: '14px',
                              textAlign: 'center',
                              width: '30%'
                            }}>
                              Service
                            </TableCell>
                            <TableCell sx={{ 
                              border: '1px solid #000', 
                              padding: '12px 16px', 
                              fontWeight: 'bold', 
                              fontSize: '14px',
                              textAlign: 'center',
                              width: '50%'
                            }}>
                              Description
                            </TableCell>
                            <TableCell sx={{ 
                              border: '1px solid #000', 
                              padding: '12px 16px', 
                              fontWeight: 'bold', 
                              fontSize: '14px',
                              textAlign: 'center',
                              width: '20%'
                            }}>
                              Amount (Rs.)
                            </TableCell>
                          </TableRow>
                        </thead>
                        <TableBody>
                          {allRows.map((row, rowIndex) => (
                            <TableRow key={`${headerIndex}-${row.serviceIndex}-${row.subIndex}`}>
                              {/* Service column */}
                              {row.isFirstSubService && (
                                <TableCell
                                  rowSpan={row.subCount}
                                  sx={{
                                    border: '1px solid #000',
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    verticalAlign: 'top',
                                    backgroundColor: '#f8f9fa',
                                    fontWeight: 'bold',
                                    fontSize: '13px'
                                  }}
                                >
                                  {row.service.name}
                                </TableCell>
                              )}

                              {/* Description column */}
                              <TableCell
                                sx={{
                                  border: '1px solid #000',
                                  padding: '12px 16px',
                                  fontSize: '13px',
                                  verticalAlign: 'top',
                                  lineHeight: 1.4
                                }}
                              >
                                {row.subService ? row.subService.name : (
                                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#666', fontSize: '13px' }}>
                                    Service details
                                  </Typography>
                                )}
                              </TableCell>

                              {/* Price column */}
                              {row.isFirstSubService && (
                                <TableCell
                                  rowSpan={row.subCount}
                                  sx={{
                                    border: '1px solid #000',
                                    textAlign: 'right',
                                    verticalAlign: 'middle',
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    backgroundColor: '#fff'
                                  }}
                                >
                                  {row.servicePrice > 0 ? `${row.servicePrice.toLocaleString()}*` : '0*'}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                          
                          {/* Package Total Row - show for all packages */}
                          {isPackage && (
                            <TableRow sx={{ backgroundColor: '#e8f4fd' }}>
                              <TableCell
                                sx={{
                                  border: '1px solid #000',
                                  borderTop: '2px solid #000',
                                  textAlign: 'left',
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  padding: '12px 16px',
                                  backgroundColor: '#e8f4fd'
                                }}
                              >
                                {header.name} Total
                              </TableCell>
                              <TableCell
                                sx={{
                                  border: '1px solid #000',
                                  borderTop: '2px solid #000',
                                  textAlign: 'center',
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  padding: '12px 16px',
                                  backgroundColor: '#e8f4fd'
                                }}
                              >
                                Package Total
                              </TableCell>
                              <TableCell
                                sx={{
                                  border: '1px solid #000',
                                  borderTop: '2px solid #000',
                                  textAlign: 'right',
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  padding: '12px 16px',
                                  backgroundColor: '#e8f4fd'
                                }}
                              >
                                {packageTotalPrice > 0 ? `${packageTotalPrice.toLocaleString()}*` : 'TBD*'}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                );
              })}
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Alert severity="info">No services selected</Alert>
            </Box>
          )}
        </Box>

        {/* Total Amount Section */}
        <TableContainer sx={{ border: '1px solid #000', boxShadow: 'none', mt: 3, backgroundColor: '#fff' }}>
          <Table sx={{ borderCollapse: 'collapse' }}>
            <TableBody>
              <TableRow sx={{ backgroundColor: '#f0f8ff' }}>
                <TableCell 
                  sx={{
                    border: '1px solid #000',
                    borderTop: '2px solid #000',
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    padding: '16px',
                    backgroundColor: '#f0f8ff',
                    width: '80%'
                  }}
                >
                  Total Payable Amount
                </TableCell>
                <TableCell 
                  sx={{
                    border: '1px solid #000',
                    borderTop: '2px solid #000',
                    textAlign: 'right',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    padding: '16px',
                    backgroundColor: '#f0f8ff',
                    width: '20%'
                  }}
                >
                  Rs. {(quotation.totalAmount || calculateTotalAmount()).toLocaleString()}*
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Terms & Conditions Section */}
        {acceptedTerms.length > 0 && (
          <Box sx={{ mt: 4, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, fontSize: '16px' }}>
              Term & Conditions:
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0, listStyleType: 'disc' }}>
              {acceptedTerms.map((term, index) => (
                <Typography 
                  key={`term-${index}`}
                  component="li" 
                  variant="body2" 
                  sx={{ mb: 0.5, lineHeight: 1.4, fontSize: '13px' }}
                >
                  {term}
                </Typography>
              ))}
            </Box>
          </Box>
        )}

        {/* Footer with Quotation ID */}
        <Box sx={{ 
          borderTop: '2px solid #000',
          pt: 1,
          mt: 3,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}>
          <Typography variant="body1" fontWeight="bold" sx={{ fontSize: '14px' }}>
            REQ {quotation.id?.replace('REQ ', '') || '0001'}
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
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

      </Container>
    </Box>
  );
};

export default QuotationSummary;