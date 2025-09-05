import React, { useState } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from "@mui/material";

import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

// Timeline components are from @mui/lab, not @mui/material
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";

const EnhancedApprovalPreviewModal = ({
  open,
  onClose,
  quotation,
  changeHistory,
  user,
  onApprove,
  onReject,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    services: true,
    discount: true,
    terms: true,
    timeline: false,
  });

  const handleSectionToggle = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Defensive: Check quotation and changeHistory exist before useMemo calculations
  const changesSummary = React.useMemo(() => {
    if (!quotation || !changeHistory) return null;

    const serviceChanges = changeHistory.filter((c) => c.type === "service");
    const discountChanges = changeHistory.filter((c) => c.type === "discount");
    const termsChanges = changeHistory.filter((c) => c.type === "terms");

    return {
      services: {
        added: serviceChanges.filter((c) => c.action === "added"),
        removed: serviceChanges.filter((c) => c.action === "removed"),
        modified: serviceChanges.filter((c) => c.action === "modified"),
      },
      discount: {
        original:
          discountChanges.find((c) => c.field === "discount_percent")?.oldValue ||
          0,
        current: quotation.effectiveDiscountPercent || 0,
        amount_impact:
          discountChanges.find((c) => c.field === "total_amount")?.impact || 0,
      },
      terms: {
        added: termsChanges.filter((c) => c.action === "added"),
        removed: termsChanges.filter((c) => c.action === "removed"),
        modified: termsChanges.filter((c) => c.action === "modified"),
      },
    };
  }, [changeHistory, quotation]);

  const getChangeIcon = (action) => {
    switch (action) {
      case "added":
        return <AddIcon color="success" fontSize="small" />;
      case "removed":
        return <RemoveIcon color="error" fontSize="small" />;
      case "modified":
        return <EditIcon color="warning" fontSize="small" />;
      default:
        return null;
    }
  };

  const getChangeColor = (action) => {
    switch (action) {
      case "added":
        return "success";
      case "removed":
        return "error";
      case "modified":
        return "warning";
      default:
        return "default";
    }
  };

  const renderServiceChanges = () => {
    if (!changesSummary?.services) return null;

    const { added, removed, modified } = changesSummary.services;
    const hasChanges = added.length > 0 || removed.length > 0 || modified.length > 0;

    if (!hasChanges)
      return (
        <Typography variant="body2" color="textSecondary">
          No service selection changes detected
        </Typography>
      );

    return (
      <>
        {/* Added Services */}
        {added.length > 0 && (
          <Box mb={2}>
            <Typography variant="h6">Added Services ({added.length})</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service Name</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Sub-Services</TableCell>
                    <TableCell>Added By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {added.map((change, i) => (
                    <TableRow key={"added_" + i}>
                      <TableCell>{change.newValue?.name || change.description}</TableCell>
                      <TableCell>
                        ₹{change.newValue?.amount?.toLocaleString() || "N/A"}
                      </TableCell>
                      <TableCell>
                        {change.newValue?.subServices?.length || 0} items
                      </TableCell>
                      <TableCell>{change.changedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Removed Services */}
        {removed.length > 0 && (
          <Box mb={2}>
            <Typography variant="h6">Removed Services ({removed.length})</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service Name</TableCell>
                    <TableCell>Original Amount</TableCell>
                    <TableCell>Sub-Services</TableCell>
                    <TableCell>Removed By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {removed.map((change, i) => (
                    <TableRow key={"removed_" + i}>
                      <TableCell>{change.oldValue?.name || change.description}</TableCell>
                      <TableCell>
                        ₹{change.oldValue?.amount?.toLocaleString() || "N/A"}
                      </TableCell>
                      <TableCell>
                        {change.oldValue?.subServices?.length || 0} items
                      </TableCell>
                      <TableCell>{change.changedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Modified Services */}
        {modified.length > 0 && (
          <Box mb={2}>
            <Typography variant="h6">Modified Services ({modified.length})</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service Name</TableCell>
                    <TableCell>Before</TableCell>
                    <TableCell>After</TableCell>
                    <TableCell>Change</TableCell>
                    <TableCell>Modified By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modified.map((change, i) => (
                    <TableRow key={"modified_" + i}>
                      <TableCell>{change.newValue?.name || change.description}</TableCell>
                      <TableCell>
                        ₹{change.oldValue?.amount?.toLocaleString() || "N/A"}
                      </TableCell>
                      <TableCell>
                        ₹{change.newValue?.amount?.toLocaleString() || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${change.impact > 0 ? "+" : ""}${change.impact?.toLocaleString() || "N/A"}`}
                          color={change.impact > 0 ? "success" : change.impact < 0 ? "error" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{change.changedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </>
    );
  };

  const renderDiscountChanges = () => {
    if (!changesSummary?.discount) return null;

    const { original, current, amount_impact } = changesSummary.discount;
    const hasDiscountChange = original !== current;

    return (
      <Box>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Original Discount: {original}%
        </Typography>
        <Typography variant="body2" gutterBottom>
          ₹{((quotation?.totalAmount || 0) * original) / 100}
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Current Discount: {current}%
        </Typography>
        <Typography variant="body2" gutterBottom>
          ₹{((quotation?.totalAmount || 0) * current) / 100}
        </Typography>

        {hasDiscountChange && (
          <Alert
            severity={user?.threshold ? (current > user.threshold ? "warning" : "info") : "info"}
            sx={{ mt: 2 }}
          >
            <Typography variant="body2">
              Discount Impact Analysis
              <br />
              • Change: {original}% → {current}% ({current > original ? "+" : ""}
              {(current - original).toFixed(1)}%)
              <br />
              • Amount Impact: ₹
              {Math.abs(amount_impact).toLocaleString()}{" "}
              {amount_impact > 0 ? "increase" : "decrease"}
              <br />
              • Your Threshold: {user?.threshold || 0}%
              <br />
              • Status:{" "}
              {current > (user?.threshold || 0)
                ? "Exceeds threshold - requires approval"
                : "Within approved limits"}
            </Typography>
          </Alert>
        )}
      </Box>
    );
  };

  const renderTermsChanges = () => {
    if (!changesSummary?.terms) return null;

    const { added, removed, modified } = changesSummary.terms;
    const hasChanges = added.length > 0 || removed.length > 0 || modified.length > 0;

    if (!hasChanges)
      return (
        <Typography variant="body2" color="textSecondary">
          No terms and conditions changes detected
        </Typography>
      );

    return (
      <>
        {/* Added Terms */}
        {added.length > 0 && (
          <Box mb={2}>
            <Typography variant="h6">Added Terms ({added.length})</Typography>
            {added.map((change, i) => (
              <Typography key={"added_terms_" + i} variant="body2" sx={{ mt: 1 }}>
                + {change.description || change.newValue} <br />
                <i>
                  Added by {change.changedBy} on{" "}
                  {new Date(change.timestamp).toLocaleString()}
                </i>
              </Typography>
            ))}
          </Box>
        )}

        {/* Removed Terms */}
        {removed.length > 0 && (
          <Box mb={2}>
            <Typography variant="h6">Removed Terms ({removed.length})</Typography>
            {removed.map((change, i) => (
              <Typography key={"removed_terms_" + i} variant="body2" sx={{ mt: 1 }}>
                - {change.description || change.oldValue} <br />
                <i>
                  Removed by {change.changedBy} on{" "}
                  {new Date(change.timestamp).toLocaleString()}
                </i>
              </Typography>
            ))}
          </Box>
        )}

        {/* Modified Terms */}
        {modified.length > 0 && (
          <Box mb={2}>
            <Typography variant="h6">Modified Terms ({modified.length})</Typography>
            {modified.map((change, i) => (
              <Typography key={"modified_terms_" + i} variant="body2" sx={{ mt: 1 }}>
                - {change.oldValue} <br />
                + {change.newValue} <br />
                <i>
                  Modified by {change.changedBy} on{" "}
                  {new Date(change.timestamp).toLocaleString()}
                </i>
              </Typography>
            ))}
          </Box>
        )}
      </>
    );
  };

  const renderChangeTimeline = () => {
    if (!changeHistory || changeHistory.length === 0) return null;

    const sortedChanges = [...changeHistory].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return (
      <Timeline>
        {sortedChanges.slice(0, 10).map((change, index) => (
          <TimelineItem key={"timeline_" + index}>
            <TimelineOppositeContent color="text.secondary" sx={{ fontSize: 12 }}>
              {new Date(change.timestamp).toLocaleString()}
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color={getChangeColor(change.action)} />
              {index < sortedChanges.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <Box display="flex" alignItems="center" gap={1}>
                {getChangeIcon(change.action)}
                <Typography variant="body2" fontWeight="bold">
                  {change.type.charAt(0).toUpperCase() + change.type.slice(1)}{" "}
                  {change.action}
                </Typography>
              </Box>
              <Typography variant="body2">{change.description}</Typography>
              <Typography variant="caption" color="text.secondary">
                by {change.changedBy}
              </Typography>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    );
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Enhanced Approval Preview - {quotation.id}</DialogTitle>
      <DialogContent dividers>
        {/* Summary Cards */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Total Value
                </Typography>
                <Typography variant="h6">
                  ₹{quotation.totalAmount?.toLocaleString() || "0"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Discount Applied
                </Typography>
                <Typography variant="h6">
                  {quotation.effectiveDiscountPercent || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Changes Made
                </Typography>
                <Typography variant="h6">
                  {changeHistory?.length || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Service Selection Changes */}
        <Accordion
          expanded={expandedSections.services}
          onChange={() => handleSectionToggle("services")}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Service Selection Changes</Typography>
          </AccordionSummary>
          <AccordionDetails>{renderServiceChanges()}</AccordionDetails>
        </Accordion>

        {/* Discount Impact Analysis */}
        <Accordion
          expanded={expandedSections.discount}
          onChange={() => handleSectionToggle("discount")}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Discount Impact Analysis</Typography>
          </AccordionSummary>
          <AccordionDetails>{renderDiscountChanges()}</AccordionDetails>
        </Accordion>

        {/* Terms & Conditions Changes */}
        <Accordion
          expanded={expandedSections.terms}
          onChange={() => handleSectionToggle("terms")}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Terms & Conditions Changes</Typography>
          </AccordionSummary>
          <AccordionDetails>{renderTermsChanges()}</AccordionDetails>
        </Accordion>

        {/* Change Timeline */}
        <Accordion
          expanded={expandedSections.timeline}
          onChange={() => handleSectionToggle("timeline")}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Change Timeline</Typography>
          </AccordionSummary>
          <AccordionDetails>{renderChangeTimeline()}</AccordionDetails>
        </Accordion>

        {/* Approval Summary */}
        <Alert
          severity={
            user?.threshold && quotation.effectiveDiscountPercent > user.threshold
              ? "warning"
              : "info"
          }
          sx={{ mt: 3 }}
        >
          <Typography variant="h6" mb={1}>
            Approval Summary
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 0 }}>
            {quotation.effectiveDiscountPercent > (user?.threshold || 0) && (
              <li>
                Discount exceeds your threshold ({user?.threshold || 0}%)
              </li>
            )}
            {quotation.customTerms && quotation.customTerms.length > 0 && (
              <li>Custom terms added ({quotation.customTerms.length})</li>
            )}
            {/* Additional approval reasons can be added here */}
          </Box>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onReject} color="error" variant="outlined">
          Reject
        </Button>
        <Button onClick={onApprove} color="primary" variant="contained">
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedApprovalPreviewModal;
