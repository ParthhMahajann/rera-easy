// src/pages/QuotationServices.jsx
import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { QuotationProvider } from "../context/QuotationContext";
import QuotationBuilder from "../components/QuotationBuilder";
import { updateQuotation } from "../services/quotations";

export default function QuotationServices() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQuotationComplete = useCallback(
    async (result) => {
      try {
        setLoading(true);
        setError("");
        
        // Handle both old format (array) and new format (object with headers and requiresApproval)
        let selectedHeaders, requiresApproval = false;
        
        if (Array.isArray(result)) {
          // Old format - backward compatibility
          selectedHeaders = result;
        } else {
          // New format with approval requirement
          selectedHeaders = result.headers;
          requiresApproval = result.requiresApproval;
        }
        
        // Transform the selected headers to the expected format
        const headers = selectedHeaders.map(({ name, services = [] }) => ({
          header: name,
          services: services.map(({ id, name, label, subServices = {} }) => ({
            id: id || name,
            label: label || name,
            subServices: Object.keys(subServices).map((ss) => ({
              id: ss,
              text: ss,
            })),
          })),
        }));

        console.log("Saving headers:", headers); // Debug log
        console.log("Requires approval:", requiresApproval); // Debug log
        
        // Prepare update data
        const updateData = { 
          headers,
          ...(requiresApproval && { requiresApproval: true })
        };
        
        // ✅ Use the fixed updateQuotation function with authentication
        await updateQuotation(id, updateData);
        
        // Navigate to pricing step
        navigate(`/quotations/${id}/pricing`);
      } catch (err) {
        console.error("Failed to save services:", err);
        setError(err.message || "Failed to save services");
      } finally {
        setLoading(false);
      }
    },
    [id, navigate]
  );

  return (
    <QuotationProvider>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header - matching Dashboard style */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Services Selection
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Select the services you need for this quotation
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate("/quotations/new")}
            sx={{ textTransform: 'none' }}
          >
            ← Back to Project Details
          </Button>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 3 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Saving services...</Typography>
          </Box>
        )}

        {/* Quotation Builder */}
        <QuotationBuilder 
          onComplete={handleQuotationComplete}
          loading={loading}
        />
      </Container>
    </QuotationProvider>
  );
}
