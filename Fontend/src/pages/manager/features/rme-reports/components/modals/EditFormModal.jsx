import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Alert,
    IconButton,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TableHead,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Radio,
    MenuItem,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { X, Save, ArrowLeft } from 'lucide-react';
import axiosInstance from '../../../../../../api/axios';
import StyledTextField from '../../../../../../components/ui/StyledTextField';
import StyledTextarea from '../../../../../../components/ui/StyledTextarea';
import StyledSelect from '../../../../../../components/ui/StyledSelect';
import OutlineButton from '../../../../../../components/ui/OutlineButton';
import DashboardLoader from '../../../../../../components/Loader/DashboardLoader';
import {
    BLUE_COLOR,
    GRAY_COLOR,
    TEXT_COLOR,
    RED_COLOR,
} from '../../utils/constants';
import UpdateButton from '../../../../../../components/ui/UpdateButton';
import UpdateComponent from '../modals/UpdateDialog';

const EditFormModal = ({ open, onClose, workOrderData, onSave, showSnackbar }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [isLoading, setIsLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [formData, setFormData] = useState([]);
    const [septicComponentsData, setSepticComponentsData] = useState([]);
    const [error, setError] = useState(null);
    const [yesNoFields, setYesNoFields] = useState({});
    const [inspectionFields, setInspectionFields] = useState({});
    const [servicedFields, setServicedFields] = useState({});
    const [showComponentForm, setShowComponentForm] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        const fetchFormData = async () => {
            if (!workOrderData?.id) return;

            setIsLoading(true);
            setError(null);
            try {
                const response = await axiosInstance.get(`/work-order-edit/${workOrderData.id}/`);

                let serverData = response.data;
                let formDataArray = [];
                let componentsData = [];

                if (serverData.septic_components_form_data && Array.isArray(serverData.septic_components_form_data)) {
                    componentsData = serverData.septic_components_form_data;
                }

                if (serverData.data && serverData.data.form_data && Array.isArray(serverData.data.form_data)) {
                    formDataArray = serverData.data.form_data;
                } else if (serverData.form_data && Array.isArray(serverData.form_data)) {
                    formDataArray = serverData.form_data;
                } else if (Array.isArray(serverData)) {
                    formDataArray = serverData;
                }

                if (formDataArray.length > 0) {
                    const processedFormData = formDataArray.map(field => {
                        let value = '';
                        if (field.selected !== undefined && field.selected !== null) {
                            value = field.selected;
                        } else if (field.value !== undefined && field.value !== null) {
                            value = field.value;
                        }

                        let label = field.label || field.name;
                        if (label) {
                            label = label.replace(/\s*\([^)]*\)/g, '');
                            label = label.replace(/\s*\[[^\]]*\]/g, '');
                            label = label.trim();
                        }

                        return {
                            ...field,
                            value: value,
                            label: label,
                            status: field.status || ''
                        };
                    });

                    setFormData(processedFormData);
                    setSepticComponentsData(componentsData);

                    const initialYesNoFields = {};
                    const initialInspectionFields = {};
                    const initialServicedFields = {};

                    processedFormData.forEach((field) => {
                        if (field.type === 'select') {
                            const cleanOptions = field.options ? field.options.filter(opt => opt !== '' && opt !== null && opt !== undefined) : [];

                            const isYesNoField = cleanOptions.length <= 3 &&
                                cleanOptions.every(opt => {
                                    const optStr = opt.toString().toUpperCase();
                                    return optStr === 'YES' ||
                                        optStr === 'NO' ||
                                        optStr === 'N/A' ||
                                        optStr === 'NA';
                                });

                            const isInspectionField = cleanOptions.length === 3 &&
                                cleanOptions.includes('Fully Inspected') &&
                                cleanOptions.includes('Partially Inspected') &&
                                cleanOptions.includes('Not Inspected');

                            const isServicedField = cleanOptions.length === 3 &&
                                cleanOptions.includes('Fully Serviced') &&
                                cleanOptions.includes('Partially Serviced') &&
                                cleanOptions.includes('Not Serviced');

                            if (isYesNoField) {
                                initialYesNoFields[field.name] = { isYesNo: true };
                            }

                            if (isInspectionField) {
                                initialInspectionFields[field.name] = { isInspection: true };
                            }

                            if (isServicedField) {
                                initialServicedFields[field.name] = { isServiced: true };
                            }
                        }
                    });

                    setYesNoFields(initialYesNoFields);
                    setInspectionFields(initialInspectionFields);
                    setServicedFields(initialServicedFields);
                } else {
                    setFormData([]);
                }

            } catch (error) {
                setError(error.response?.data?.message || 'Failed to load form data');
                setFormData([]);
                setSepticComponentsData([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (open && workOrderData?.id && !showComponentForm) {
            fetchFormData();
        }
    }, [workOrderData, open, showComponentForm]);

    const handleComponentFormClose = () => {
        setShowComponentForm(false);
        setSelectedItem(null);
    };

    const handleComponentFormSubmit = (id, submittedData) => {
        console.log('Component submitted:', submittedData);

        if (submittedData && submittedData.components) {
            setSepticComponentsData(submittedData.components);
        }

        if (showSnackbar) {
            showSnackbar('Component added successfully', 'success');
        }
        setShowComponentForm(false);
        setSelectedItem(null);
    };

    const handleInputChange = (fieldName, value) => {
        setFormData(prev =>
            prev.map(field =>
                field.name === fieldName
                    ? {
                        ...field,
                        value: value,
                        ...(field.type === 'select' ? { selected: value } : {})
                    }
                    : field
            )
        );
    };

    const handleSubmit = async () => {
        if (!workOrderData?.id) return;

        setSaveLoading(true);
        setError(null);

        try {
            const formDataArray = formData.map(field => {
                const fieldObj = {
                    name: field.name,
                    type: field.type,
                };

                if (field.type === 'select') {
                    fieldObj.selected = field.value || '';
                    if (field.options && Array.isArray(field.options)) {
                        fieldObj.options = field.options;
                    }
                } else {
                    fieldObj.value = field.value || '';
                }

                if (field.label) fieldObj.label = field.label;
                if (field.required !== undefined) fieldObj.required = field.required;
                if (field.placeholder) fieldObj.placeholder = field.placeholder;
                if (field.validation) fieldObj.validation = field.validation;
                if (field.status) fieldObj.status = field.status;

                return fieldObj;
            });

            const payload = {
                form_data: formDataArray,
                work_order_today: workOrderData.id,
                updated_at: new Date().toISOString(),
            };

            if (septicComponentsData.length > 0) {
                payload.septic_components_form_data = septicComponentsData;
            }

            // 🔥 Close modal immediately after payload is ready
            onClose();

            // ℹ️ Inform user that saving is in progress
            if (showSnackbar) {
                showSnackbar('Saving changes… please wait', 'info');
            }

            const response = await axiosInstance.patch(
                `/work-order-edit/${workOrderData.id}/`,
                payload
            );

            if (onSave) {
                onSave(formDataArray, response.data);
            }

            if (showSnackbar) {
                showSnackbar('Form saved successfully', 'success');
            }

        } catch (error) {
            if (showSnackbar) {
                showSnackbar(
                    error.response?.data?.message || 'Failed to save form',
                    'error'
                );
            }
        } finally {
            setSaveLoading(false);
        }
    };



    const isYesNoField = (fieldName) => yesNoFields[fieldName]?.isYesNo;
    const isInspectionField = (fieldName) => inspectionFields[fieldName]?.isInspection;
    const isServicedField = (fieldName) => servicedFields[fieldName]?.isServiced;

    const renderFormField = (field, index) => {
        const uniqueKey = `${field.name}-${index}`;
        const value = field.value || '';
        const cleanOptions = field.options ? field.options.filter(opt => opt !== '' && opt !== null && opt !== undefined) : [];
        const isYesNo = isYesNoField(field.name);
        const isInspection = isInspectionField(field.name);
        const isServiced = isServicedField(field.name);
        const hasStatus = field.status && field.status !== '';

        const rowBgColor = (isInspection || isServiced) ? BLUE_COLOR : 'transparent';
        const cellTextColor = (isInspection || isServiced) ? 'white' : TEXT_COLOR;
        const cellHoverBgColor = (isInspection || isServiced)
            ? alpha(BLUE_COLOR, 0.9)
            : alpha(theme.palette.action.hover, 0.04);

        const fontSize = '0.75rem';
        const padding = '6px 8px';

        if (isYesNo) {
            return (
                <TableRow
                    key={uniqueKey}
                    sx={{
                        backgroundColor: rowBgColor,
                        '&:hover': {
                            backgroundColor: cellHoverBgColor
                        }
                    }}
                >
                    <TableCell
                        size="small"
                        sx={{
                            width: '80%',
                            fontWeight: 600,
                            fontSize: fontSize,
                            color: cellTextColor,
                            verticalAlign: 'top',
                            padding: padding,
                            lineHeight: 1.2,
                            backgroundColor: rowBgColor,
                        }}
                    >
                        {field.label || field.name}
                        {field.required && (
                            <Typography component="span" sx={{
                                color: (isInspection || isServiced) ? 'white' : RED_COLOR,
                                ml: 0.5,
                                fontSize: fontSize
                            }}>
                                *
                            </Typography>
                        )}
                    </TableCell>
                    <TableCell
                        size="small"
                        sx={{
                            padding: padding,
                            backgroundColor: rowBgColor,
                            width: '30%',
                            textAlign: 'center',
                        }}
                    >
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%'
                        }}>
                            <RadioGroup
                                row
                                name={field.name}
                                value={value}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                sx={{
                                    gap: 1.5,
                                    justifyContent: 'center',
                                }}
                            >
                                {cleanOptions.map((option, optionIndex) => (
                                    <FormControlLabel
                                        key={`${option}-${optionIndex}`}
                                        value={option}
                                        control={
                                            <Radio
                                                size="small"
                                                sx={{
                                                    '& .MuiSvgIcon-root': {
                                                        fontSize: '1rem',
                                                        color: (isInspection || isServiced) ? 'rgba(255,255,255,0.7)' : GRAY_COLOR,
                                                    },
                                                    '&.Mui-checked .MuiSvgIcon-root': {
                                                        color: (isInspection || isServiced) ? 'white' : BLUE_COLOR,
                                                    },
                                                    padding: '4px'
                                                }}
                                            />
                                        }
                                        label={
                                            <Typography sx={{
                                                fontSize: fontSize,
                                                textTransform: 'uppercase',
                                                fontWeight: 500,
                                                color: cellTextColor,
                                            }}>
                                                {option || 'Select...'}
                                            </Typography>
                                        }
                                        disabled={isLoading || saveLoading}
                                        sx={{
                                            marginRight: 0.5,
                                            '& .MuiFormControlLabel-label': {
                                                fontSize: fontSize,
                                            }
                                        }}
                                    />
                                ))}
                            </RadioGroup>
                        </Box>
                        {field.required && !value && (
                            <Typography variant="caption" sx={{
                                color: (isInspection || isServiced) ? 'rgba(255,255,255,0.8)' : RED_COLOR,
                                display: 'block',
                                mt: 0.5,
                                fontSize: '0.7rem',
                                textAlign: 'center',
                            }}>
                                This field is required
                            </Typography>
                        )}
                    </TableCell>
                    <TableCell
                        size="small"
                        sx={{
                            padding: padding,
                            width: '12%',
                            textAlign: 'center',
                            backgroundColor: rowBgColor,
                        }}
                    >
                        {hasStatus ? (
                            <Typography
                                sx={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: field.status.toLowerCase() === 'deficient'
                                        ? ((isInspection || isServiced) ? 'rgba(255,200,200,0.9)' : RED_COLOR)
                                        : cellTextColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                {field.status}
                            </Typography>
                        ) : (
                            <Typography
                                sx={{
                                    fontSize: '0.7rem',
                                    fontStyle: 'italic',
                                    color: (isInspection || isServiced) ? 'rgba(255,255,255,0.5)' : alpha(TEXT_COLOR, 0.5),
                                }}
                            >
                                -
                            </Typography>
                        )}
                    </TableCell>
                </TableRow>
            );
        }

        if (isInspection || isServiced) {
            return (
                <TableRow
                    key={uniqueKey}
                    sx={{
                        backgroundColor: rowBgColor,
                        '&:hover': {
                            backgroundColor: cellHoverBgColor
                        }
                    }}
                >
                    <TableCell
                        size="small"
                        sx={{
                            width: '80%',
                            fontWeight: 600,
                            fontSize: fontSize,
                            color: cellTextColor,
                            verticalAlign: 'top',
                            padding: padding,
                            lineHeight: 1.2,
                            backgroundColor: rowBgColor,
                        }}
                    >
                        {field.label || field.name}
                        {field.required && (
                            <Typography component="span" sx={{
                                color: 'white',
                                ml: 0.5,
                                fontSize: fontSize
                            }}>
                                *
                            </Typography>
                        )}
                    </TableCell>
                    <TableCell
                        size="small"
                        sx={{
                            padding: padding,
                            backgroundColor: rowBgColor,
                            width: '30%',
                        }}
                    >
                        <FormControl fullWidth size="small">
                            <StyledSelect
                                value={value}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                displayEmpty
                                disabled={isLoading || saveLoading}
                                error={field.required && !value}
                                sx={{
                                    '& .MuiSelect-select': {
                                        fontSize: fontSize,
                                        padding: '4px 8px',
                                        color: TEXT_COLOR,
                                        fontWeight: 600,
                                        backgroundColor: 'white',
                                        minHeight: 'auto'
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: alpha(GRAY_COLOR, 0.3),
                                        borderWidth: '1px',
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: BLUE_COLOR,
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: BLUE_COLOR,
                                    }
                                }}
                            >
                                {cleanOptions.map((option, optionIndex) => (
                                    <MenuItem
                                        key={`${option}-${optionIndex}`}
                                        value={option}
                                        sx={{
                                            fontSize: fontSize,
                                            color: TEXT_COLOR,
                                            fontWeight: 400,
                                            minHeight: 'auto',
                                            padding: '4px 8px'
                                        }}
                                    >
                                        {option}
                                    </MenuItem>
                                ))}
                            </StyledSelect>
                        </FormControl>
                    </TableCell>
                    <TableCell
                        size="small"
                        sx={{
                            padding: padding,
                            width: '12%',
                            textAlign: 'center',
                            backgroundColor: rowBgColor,
                        }}
                    >
                        {hasStatus ? (
                            <Typography
                                sx={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: field.status.toLowerCase() === 'deficient'
                                        ? 'rgba(255,200,200,0.9)'
                                        : cellTextColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                {field.status}
                            </Typography>
                        ) : (
                            <Typography
                                sx={{
                                    fontSize: '0.7rem',
                                    fontStyle: 'italic',
                                    color: 'rgba(255,255,255,0.5)',
                                }}
                            >
                                -
                            </Typography>
                        )}
                    </TableCell>
                </TableRow>
            );
        }

        switch (field.type) {
            case 'select':
                return (
                    <TableRow
                        key={uniqueKey}
                        sx={{
                            backgroundColor: rowBgColor,
                            '&:hover': {
                                backgroundColor: cellHoverBgColor
                            }
                        }}
                    >
                        <TableCell
                            size="small"
                            sx={{
                                width: '80%',
                                fontWeight: 600,
                                fontSize: fontSize,
                                color: cellTextColor,
                                verticalAlign: 'top',
                                padding: padding,
                                lineHeight: 1.2,
                                backgroundColor: rowBgColor,
                            }}
                        >
                            {field.label || field.name}
                            {field.required && (
                                <Typography component="span" sx={{
                                    color: RED_COLOR,
                                    ml: 0.5,
                                    fontSize: fontSize
                                }}>
                                    *
                                </Typography>
                            )}
                        </TableCell>
                        <TableCell
                            size="small"
                            sx={{
                                padding: padding,
                                backgroundColor: rowBgColor,
                                width: '30%',
                            }}
                        >
                            <FormControl fullWidth size="small">
                                <StyledSelect
                                    value={value}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                    displayEmpty
                                    disabled={isLoading || saveLoading}
                                    error={field.required && !value}
                                    sx={{
                                        '& .MuiSelect-select': {
                                            fontSize: fontSize,
                                            color: TEXT_COLOR,
                                            minHeight: 'auto'
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: alpha(GRAY_COLOR, 0.3),
                                            borderWidth: '1px'
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: alpha(TEXT_COLOR, 0.8),
                                        }
                                    }}
                                >
                                    {cleanOptions.map((option, optionIndex) => (
                                        <MenuItem
                                            key={`${option}-${optionIndex}`}
                                            value={option}
                                            sx={{
                                                fontSize: fontSize,
                                                color: TEXT_COLOR,
                                                fontWeight: 400,
                                                minHeight: 'auto',
                                                padding: '4px 8px'
                                            }}
                                        >
                                            {option}
                                        </MenuItem>
                                    ))}
                                </StyledSelect>
                            </FormControl>
                        </TableCell>
                        <TableCell
                            size="small"
                            sx={{
                                padding: padding,
                                width: '12%',
                                textAlign: 'center',
                                backgroundColor: rowBgColor,
                            }}
                        >
                            {hasStatus ? (
                                <Typography
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: field.status.toLowerCase() === 'deficient'
                                            ? RED_COLOR
                                            : cellTextColor,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    {field.status}
                                </Typography>
                            ) : (
                                <Typography
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontStyle: 'italic',
                                        color: alpha(TEXT_COLOR, 0.5),
                                    }}
                                >
                                    -
                                </Typography>
                            )}
                        </TableCell>
                    </TableRow>
                );

            case 'text':
                return (
                    <TableRow
                        key={uniqueKey}
                        sx={{
                            backgroundColor: rowBgColor,
                            '&:hover': {
                                backgroundColor: cellHoverBgColor
                            }
                        }}
                    >
                        <TableCell
                            size="small"
                            sx={{
                                width: '80%',
                                fontWeight: 600,
                                fontSize: fontSize,
                                color: cellTextColor,
                                verticalAlign: 'top',
                                padding: padding,
                                lineHeight: 1.2,
                                backgroundColor: rowBgColor,
                            }}
                        >
                            {field.label || field.name}
                            {field.required && (
                                <Typography component="span" sx={{
                                    color: RED_COLOR,
                                    ml: 0.5,
                                    fontSize: fontSize
                                }}>
                                    *
                                </Typography>
                            )}
                        </TableCell>
                        <TableCell
                            size="small"
                            sx={{
                                padding: padding,
                                backgroundColor: rowBgColor,
                                width: '30%',
                            }}
                        >
                            <StyledTextField
                                value={value}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                fullWidth
                                size="small"
                                disabled={isLoading || saveLoading}
                                placeholder={field.placeholder || ''}
                                error={field.required && !value}
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: fontSize,
                                        padding: '4px 8px',
                                        color: TEXT_COLOR,
                                        fontWeight: 400,
                                        minHeight: 'auto'
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: alpha(GRAY_COLOR, 0.3),
                                        borderWidth: '1px'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: alpha(TEXT_COLOR, 0.8),
                                    }
                                }}
                            />
                        </TableCell>
                        <TableCell
                            size="small"
                            sx={{
                                padding: padding,
                                width: '12%',
                                textAlign: 'center',
                                backgroundColor: rowBgColor,
                            }}
                        >
                            {hasStatus ? (
                                <Typography
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: field.status.toLowerCase() === 'deficient'
                                            ? RED_COLOR
                                            : cellTextColor,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    {field.status}
                                </Typography>
                            ) : (
                                <Typography
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontStyle: 'italic',
                                        color: alpha(TEXT_COLOR, 0.5),
                                    }}
                                >
                                    -
                                </Typography>
                            )}
                        </TableCell>
                    </TableRow>
                );

            case 'textarea':
                return (
                    <TableRow
                        key={uniqueKey}
                        sx={{
                            backgroundColor: rowBgColor,
                            '&:hover': {
                                backgroundColor: cellHoverBgColor
                            }
                        }}
                    >
                        <TableCell
                            size="small"
                            sx={{
                                width: '80%',
                                fontWeight: 600,
                                fontSize: fontSize,
                                color: cellTextColor,
                                verticalAlign: 'top',
                                padding: padding,
                                lineHeight: 1.2,
                                backgroundColor: rowBgColor,
                            }}
                        >
                            {field.label || field.name}
                            {field.required && (
                                <Typography component="span" sx={{
                                    color: RED_COLOR,
                                    ml: 0.5,
                                    fontSize: fontSize
                                }}>
                                    *
                                </Typography>
                            )}
                        </TableCell>
                        <TableCell
                            size="small"
                            sx={{
                                padding: padding,
                                backgroundColor: rowBgColor,
                                width: '30%',
                            }}
                        >
                            <StyledTextarea
                                value={value}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                fullWidth
                                multiline
                                size="small"
                                disabled={isLoading || saveLoading}
                                placeholder={field.placeholder || ''}
                                error={field.required && !value}
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: fontSize,
                                        lineHeight: 1.4,
                                        color: TEXT_COLOR,
                                        fontWeight: 400,
                                        padding: '6px 8px',
                                        minHeight: 'auto'
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: alpha(GRAY_COLOR, 0.3),
                                        borderWidth: '1px'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: alpha(TEXT_COLOR, 0.8),
                                    },
                                }}
                            />
                        </TableCell>
                        <TableCell
                            size="small"
                            sx={{
                                padding: padding,
                                width: '12%',
                                textAlign: 'center',
                                backgroundColor: rowBgColor,
                            }}
                        >
                            {hasStatus ? (
                                <Typography
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: field.status.toLowerCase() === 'deficient'
                                            ? RED_COLOR
                                            : cellTextColor,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    {field.status}
                                </Typography>
                            ) : (
                                <Typography
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontStyle: 'italic',
                                        color: alpha(TEXT_COLOR, 0.5),
                                    }}
                                >
                                    -
                                </Typography>
                            )}
                        </TableCell>
                    </TableRow>
                );

            default:
                return (
                    <TableRow
                        key={uniqueKey}
                        sx={{
                            backgroundColor: rowBgColor,
                            '&:hover': {
                                backgroundColor: cellHoverBgColor
                            }
                        }}
                    >
                        <TableCell
                            size="small"
                            sx={{
                                width: '80%',
                                fontWeight: 600,
                                fontSize: fontSize,
                                color: cellTextColor,
                                verticalAlign: 'top',
                                padding: padding,
                                lineHeight: 1.2,
                                backgroundColor: rowBgColor,
                            }}
                        >
                            {field.label || field.name}
                            {field.required && (
                                <Typography component="span" sx={{
                                    color: RED_COLOR,
                                    ml: 0.5,
                                    fontSize: fontSize
                                }}>
                                    *
                                </Typography>
                            )}
                        </TableCell>
                        <TableCell
                            size="small"
                            sx={{
                                padding: padding,
                                backgroundColor: rowBgColor,
                                width: '30%',
                            }}
                        >
                            <Typography variant="body2" sx={{
                                color: GRAY_COLOR,
                                fontStyle: 'italic',
                                fontSize: fontSize
                            }}>
                                Unsupported field type: {field.type}
                            </Typography>
                        </TableCell>
                        <TableCell
                            size="small"
                            sx={{
                                padding: padding,
                                width: '12%',
                                textAlign: 'center',
                                backgroundColor: rowBgColor,
                            }}
                        >
                            {hasStatus ? (
                                <Typography
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: field.status.toLowerCase() === 'deficient'
                                            ? RED_COLOR
                                            : cellTextColor,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    {field.status}
                                </Typography>
                            ) : (
                                <Typography
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontStyle: 'italic',
                                        color: alpha(TEXT_COLOR, 0.5),
                                    }}
                                >
                                    -
                                </Typography>
                            )}
                        </TableCell>
                    </TableRow>
                );
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    bgcolor: 'white',
                    borderRadius: isMobile ? 0 : '5px',
                    maxHeight: isMobile ? '100%' : '90vh',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'white',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {showComponentForm ? (
                        <IconButton
                            size="small"
                            onClick={() => setShowComponentForm(false)}
                            sx={{
                                color: GRAY_COLOR,
                                p: 0.5,
                                '&:hover': {
                                    backgroundColor: alpha(GRAY_COLOR, 0.1),
                                },
                                flexShrink: 0
                            }}
                        >
                            <ArrowLeft size={18} />
                        </IconButton>
                    ) : (
                        <Box sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(BLUE_COLOR, 0.1),
                            color: BLUE_COLOR,
                        }}>
                            <Save size={18} />
                        </Box>
                    )}
                    <Box>
                        <Typography variant="h6" sx={{
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            color: TEXT_COLOR,
                            mb: 0,
                        }}>
                            {showComponentForm ? 'Add Component' : 'Edit RME Form'}
                        </Typography>
                        <Typography variant="body2" sx={{
                            fontSize: '0.7rem',
                            color: GRAY_COLOR,
                        }}>
                            {workOrderData?.street || 'Work Order'}
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    size="small"
                    onClick={onClose}
                    disabled={saveLoading}
                    sx={{
                        color: GRAY_COLOR,
                        '&:hover': {
                            backgroundColor: alpha(GRAY_COLOR, 0.1),
                        },
                    }}
                >
                    <X size={18} />
                </IconButton>
            </DialogTitle>

            <DialogContent
                sx={{
                    p: 1.5,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': {
                        width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: '#f1f5f9',
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: '#cbd5e0',
                        borderRadius: '4px',
                        '&:hover': {
                            background: '#94a3b8',
                        },
                    },
                }}
            >
                <Box sx={{ my: 1 }}>
                    <Typography variant="h6" sx={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        mb: 0.5,
                        pt: 1,
                        color: TEXT_COLOR,
                        letterSpacing: '0.3px'
                    }}>
                        Work Order Details
                    </Typography>
                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        mb: 1.5,
                        p: 1,
                        backgroundColor: alpha(GRAY_COLOR, 0.03),
                        borderRadius: '4px',
                    }}>
                        <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                            <Typography variant="body2" sx={{
                                fontSize: '0.7rem',
                                color: GRAY_COLOR,
                                mb: 0.3,
                                fontWeight: 500
                            }}>
                                Customer Info
                            </Typography>
                            <Typography variant="body1" sx={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: TEXT_COLOR,
                                lineHeight: 1.2
                            }}>
                                {workOrderData?.street || 'N/A'}
                            </Typography>
                        </Box>
                        <Box sx={{ flex: '1 1 150px', minWidth: 0 }}>
                            <Typography variant="body2" sx={{
                                fontSize: '0.7rem',
                                color: GRAY_COLOR,
                                mb: 0.3,
                                fontWeight: 500
                            }}>
                                Technician
                            </Typography>
                            <Typography variant="body1" sx={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: TEXT_COLOR,
                                lineHeight: 1.2
                            }}>
                                {workOrderData?.technician || 'N/A'}
                            </Typography>
                        </Box>
                        <Box sx={{ flex: '1 1 120px', minWidth: 0 }}>
                            <Typography variant="body2" sx={{
                                fontSize: '0.7rem',
                                color: GRAY_COLOR,
                                mb: 0.3,
                                fontWeight: 500
                            }}>
                                Date
                            </Typography>
                            <Typography variant="body1" sx={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: TEXT_COLOR,
                                lineHeight: 1.2
                            }}>
                                {workOrderData?.date || 'N/A'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {error && (
                    <Alert
                        severity="error"
                        sx={{
                            mb: 1,
                            py: 0.5,
                            '& .MuiAlert-message': {
                                fontSize: '0.8rem',
                                py: 0.5
                            }
                        }}
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                {isLoading ? (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '200px',
                        width: '100%'
                    }}>
                        <DashboardLoader />
                    </Box>
                ) : (
                    <>
                        {showComponentForm ? (
                            <UpdateComponent
                                item={selectedItem}
                                onSubmit={handleComponentFormSubmit}
                                onClose={handleComponentFormClose}
                                showBackButton={true}
                                existingComponents={septicComponentsData}
                            />
                        ) : (
                            <>
                                <Typography variant="h6" sx={{
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    mb: 1,
                                    color: TEXT_COLOR,
                                    letterSpacing: '0.3px'
                                }}>
                                    RME Form Fields
                                </Typography>

                                {formData.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', py: 3 }}>
                                        <Alert severity="info" sx={{
                                            mb: 2,
                                            py: 0.5,
                                            '& .MuiAlert-message': {
                                                fontSize: '0.8rem',
                                                py: 0.5
                                            }
                                        }}>
                                            No form fields available for this work order
                                        </Alert>
                                    </Box>
                                ) : (
                                    <TableContainer>
                                        <Table size="small" sx={{ minWidth: 600 }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell
                                                        size="small"
                                                        sx={{
                                                            width: '80%',
                                                            fontWeight: 700,
                                                            fontSize: '0.8rem',
                                                            color: TEXT_COLOR,
                                                            backgroundColor: alpha(GRAY_COLOR, 0.05),
                                                            py: 1,
                                                            padding: '8px'
                                                        }}
                                                    >
                                                        Field Name
                                                    </TableCell>
                                                    <TableCell
                                                        size="small"
                                                        sx={{
                                                            width: '30%',
                                                            fontWeight: 700,
                                                            fontSize: '0.8rem',
                                                            color: TEXT_COLOR,
                                                            backgroundColor: alpha(GRAY_COLOR, 0.05),
                                                            py: 1,
                                                            padding: '8px'
                                                        }}
                                                    >
                                                        Value
                                                    </TableCell>
                                                    <TableCell
                                                        size="small"
                                                        sx={{
                                                            width: '12%',
                                                            fontWeight: 700,
                                                            fontSize: '0.8rem',
                                                            color: TEXT_COLOR,
                                                            backgroundColor: alpha(GRAY_COLOR, 0.05),
                                                            py: 1,
                                                            padding: '8px',
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        Status
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {formData.map((field, index) => renderFormField(field, index))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </>
                        )}
                    </>
                )}
            </DialogContent>

            {!showComponentForm && (
                <DialogActions sx={{
                    p: 1.5,
                    pt: 1,
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: 'white',
                    zIndex: 1,
                }}>
                    <OutlineButton
                        onClick={onClose}
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={saveLoading}
                        sx={{
                            minWidth: 90,
                            fontSize: '0.8rem',
                            py: 0.5,
                            px: 1.5,
                            borderColor: alpha(GRAY_COLOR, 0.3),
                            '&:hover': {
                                borderColor: RED_COLOR,
                            }
                        }}
                    >
                        Cancel
                    </OutlineButton>
                    <UpdateButton
                        onClick={handleSubmit}
                        variant="contained"
                        color="primary"
                        startIcon={saveLoading ? <CircularProgress size={14} color="inherit" /> : <Save size={16} />}
                        disabled={isLoading || saveLoading || formData.length === 0}
                        sx={{
                            minWidth: 140,
                            fontSize: '0.8rem',
                            py: 0.5,
                            px: 1.5
                        }}
                    >
                        {saveLoading ? 'Saving...' : 'Save Changes'}
                    </UpdateButton>
                </DialogActions>
            )}
        </Dialog>
    );
};

export default EditFormModal;