import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    FormControl,
    MenuItem,
    IconButton,
    useTheme,
    useMediaQuery,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Chip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Save,
    X,
    ArrowLeft,
    Edit,
    Trash2,
} from 'lucide-react';
import StyledSelect from '../../../../../../components/ui/StyledSelect';
import {
    BLUE_COLOR,
    GRAY_COLOR,
    TEXT_COLOR,
    ORANGE_COLOR,
} from '../../utils/constants';
import OutlineButton from '../../../../../../components/ui/OutlineButton';
import septic_components from '../../data/septic_components.json';
import StyledTextField from '../../../../../../components/ui/StyledTextField';
import UpdateButton from '../../../../../../components/ui/UpdateButton';

const UpdateComponent = ({ item, onSubmit, onClose, existingComponents = [] }) => {
    const [formData, setFormData] = useState({
        category: '',
        componentType: '',
        manufacturer: '',
        model: '',
        customLabel: '',
        serial: '',
        tankSize: ''
    });

    // Define splitComponentName function first using useCallback
    const splitComponentName = useCallback((componentName) => {
        if (!componentName) return { category: '', componentType: '' };
        const parts = componentName.split(':');
        if (parts.length >= 2) {
            const category = parts[0].trim();
            const componentType = parts.slice(1).join(':').trim();
            return { category, componentType };
        }
        return { category: componentName, componentType: componentName };
    }, []);

    // Use existingComponents as initial data if provided, otherwise use default data
    const [tableData, setTableData] = useState(() => {
        if (existingComponents && existingComponents.length > 0) {
            // Transform the existing components data to match our table structure
            return existingComponents.map((component, index) => {
                const { component: compName, model: compModel, serial, tankSize, sortOrder } = component;
                const { category, componentType } = splitComponentName(compName || '');

                return {
                    id: component.id || index + 1,
                    component: compName || '',
                    userDefinedLabel: component.userDefinedLabel || component.customLabel || '',
                    manufacturer: component.manufacturer || '',
                    model: compModel || '',
                    serial: serial || '',
                    tankSize: tankSize || '',
                    sortOrder: sortOrder || index + 1,
                    status: "active"
                };
            });
        }
        return [];
    });

    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('sortOrder');
    const [selectedComponent, setSelectedComponent] = useState(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const categories = Object.keys(septic_components).map((categoryName, index) => ({
        value: (index + 1).toString(),
        label: categoryName
    }));

    const categoriesWithPlaceholder = [
        { value: '', label: 'Select Category' },
        ...categories
    ];

    const categoryComponents = Object.keys(septic_components).reduce((acc, categoryName, index) => {
        const categoryId = (index + 1).toString();
        const components = Object.keys(septic_components[categoryName]).map(compName => ({
            value: compName,
            label: compName,
            componentData: septic_components[categoryName][compName]
        }));

        acc[categoryId] = [{ value: '', label: 'Select Component Type' }, ...components];
        return acc;
    }, {});

    categoryComponents['default'] = [{ value: '', label: 'Select Component Type' }];

    const getComponentsForCategory = () => {
        if (!formData.category) {
            return [{ value: '', label: 'Select Component Type' }];
        }
        return categoryComponents[formData.category] || categoryComponents['default'];
    };

    const getManufacturersForComponent = () => {
        if (!formData.componentType || !formData.category) {
            return [{ value: '', label: 'Select Manufacturer' }];
        }

        const components = categoryComponents[formData.category];
        const component = components.find(comp => comp.value === formData.componentType);

        if (!component || !component.componentData) {
            return [{ value: '', label: 'Select Manufacturer' }];
        }

        const componentData = component.componentData;
        const manufacturerNames = Object.keys(componentData);

        const manufacturers = manufacturerNames.map(manName => {
            const manData = componentData[manName];
            return {
                value: manName,
                label: manName,
                manufacturerData: manData
            };
        });

        return [{ value: '', label: 'Select Manufacturer' }, ...manufacturers];
    };

    const getModelsForManufacturer = () => {
        if (!formData.manufacturer || !formData.componentType || !formData.category) {
            return [{ value: '', label: 'Select Model' }];
        }

        const components = categoryComponents[formData.category];
        const component = components.find(comp => comp.value === formData.componentType);

        if (!component || !component.componentData) {
            return [{ value: '', label: 'Select Model' }];
        }

        const componentData = component.componentData;
        const manufacturerName = formData.manufacturer;

        if (!manufacturerName || !componentData[manufacturerName]) {
            return [{ value: '', label: 'Select Model' }];
        }

        const manufacturerData = componentData[manufacturerName];

        if (!manufacturerData.models || manufacturerData.models.length === 0) {
            return [{ value: '', label: 'No models available' }];
        }

        const models = manufacturerData.models.map(model => ({
            value: model.name,
            label: model.name
        }));

        return [{ value: '', label: 'Select Model' }, ...models];
    };

    const handleChange = (field, value) => {
        if (field === 'category') {
            setFormData(prev => ({
                ...prev,
                [field]: value,
                componentType: '',
                manufacturer: '',
                model: ''
            }));
        }
        else if (field === 'componentType') {
            setFormData(prev => ({
                ...prev,
                [field]: value,
                manufacturer: '',
                model: ''
            }));
        }
        else if (field === 'manufacturer') {
            setFormData(prev => ({
                ...prev,
                [field]: value,
                model: ''
            }));
        }
        else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const findCategoryId = (categoryName) => {
        const foundCategory = categories.find(cat => cat.label === categoryName);
        return foundCategory ? foundCategory.value : '';
    };

    const findComponentTypeValue = (categoryId, componentTypeName) => {
        if (!categoryId) return '';
        const components = categoryComponents[categoryId];
        if (!components) return '';
        const foundComponent = components.find(comp => comp.label === componentTypeName);
        return foundComponent ? foundComponent.value : '';
    };

    const findManufacturerValue = (categoryId, componentTypeValue, manufacturerName) => {
        if (!categoryId || !componentTypeValue || !manufacturerName) return '';
        const components = categoryComponents[categoryId];
        const component = components.find(comp => comp.value === componentTypeValue);

        if (!component || !component.componentData) return '';

        const manufacturerExists = Object.keys(component.componentData).some(manName =>
            manName === manufacturerName
        );

        return manufacturerExists ? manufacturerName : '';
    };

    const findModelValue = (categoryId, componentTypeValue, manufacturerName, modelName) => {
        if (!categoryId || !componentTypeValue || !manufacturerName || !modelName) return '';

        const components = categoryComponents[categoryId];
        const component = components.find(comp => comp.value === componentTypeValue);

        if (!component || !component.componentData || !component.componentData[manufacturerName]) return '';

        const manufacturerData = component.componentData[manufacturerName];

        const modelExists = manufacturerData.models &&
            manufacturerData.models.some(model => model.name === modelName);

        return modelExists ? modelName : '';
    };

    const handleSubmit = () => {
        if (selectedComponent) {
            // Edit existing component
            const submittedData = {
                id: selectedComponent.id,
                category: categories.find(cat => cat.value === formData.category)?.label || '',
                componentType: getComponentsForCategory().find(comp => comp.value === formData.componentType)?.label || '',
                manufacturer: formData.manufacturer || '',
                model: formData.model || '',
                customLabel: formData.customLabel,
                serial: formData.serial || '',
                tankSize: formData.tankSize || ''
            };

            const componentName = submittedData.category ?
                `${submittedData.category}: ${submittedData.componentType}` :
                submittedData.componentType;

            const updatedTableData = tableData.map(item =>
                item.id === selectedComponent.id
                    ? {
                        ...item,
                        component: componentName,
                        userDefinedLabel: submittedData.customLabel || item.userDefinedLabel,
                        manufacturer: submittedData.manufacturer || item.manufacturer,
                        model: submittedData.model || item.model,
                        serial: submittedData.serial || item.serial,
                        tankSize: submittedData.tankSize || item.tankSize,
                    }
                    : item
            );

            setTableData(updatedTableData);

            if (onSubmit) {
                onSubmit(item?.id, {
                    ...submittedData,
                    components: updatedTableData
                });
            }

            resetForm();
        } else {
            // Add new component
            const newComponent = {
                id: tableData.length > 0 ? Math.max(...tableData.map(c => c.id)) + 1 : 1,
                component: formData.category && formData.componentType ?
                    `${categories.find(cat => cat.value === formData.category)?.label}: ${getComponentsForCategory().find(comp => comp.value === formData.componentType)?.label}` :
                    '',
                userDefinedLabel: formData.customLabel || '',
                manufacturer: formData.manufacturer || '',
                model: formData.model || '',
                serial: formData.serial || '',
                tankSize: formData.tankSize || '',
                sortOrder: tableData.length > 0 ? Math.max(...tableData.map(c => c.sortOrder)) + 1 : 1,
                status: "active"
            };

            const updatedTableData = [...tableData, newComponent];
            setTableData(updatedTableData);

            if (onSubmit) {
                onSubmit(item?.id, {
                    category: categories.find(cat => cat.value === formData.category)?.label || '',
                    componentType: getComponentsForCategory().find(comp => comp.value === formData.componentType)?.label || '',
                    manufacturer: formData.manufacturer || '',
                    model: formData.model || '',
                    customLabel: formData.customLabel || '',
                    serial: formData.serial || '',
                    tankSize: formData.tankSize || '',
                    components: updatedTableData
                });
            }

            resetForm();
        }
    };

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            category: '',
            componentType: '',
            manufacturer: '',
            model: '',
            customLabel: '',
            serial: '',
            tankSize: ''
        });
        setSelectedComponent(null);
    };

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleDelete = (id) => {
        const updatedTableData = tableData.filter(item => item.id !== id);
        setTableData(updatedTableData);

        if (selectedComponent?.id === id) {
            resetForm();
        }

        // Notify parent about the deletion
        if (onSubmit) {
            onSubmit(item?.id, {
                components: updatedTableData
            });
        }
    };

    const handleEdit = (row) => {
        setSelectedComponent(row);

        const { category: categoryName, componentType: typeName } = splitComponentName(row.component);

        const categoryValue = findCategoryId(categoryName);
        const componentTypeValue = findComponentTypeValue(categoryValue, typeName);
        const manufacturerValue = findManufacturerValue(categoryValue, componentTypeValue, row.manufacturer);
        const modelValue = findModelValue(categoryValue, componentTypeValue, row.manufacturer, row.model);

        setFormData({
            category: categoryValue,
            componentType: componentTypeValue,
            manufacturer: manufacturerValue,
            model: modelValue,
            customLabel: row.userDefinedLabel || '',
            serial: row.serial || '',
            tankSize: row.tankSize || ''
        });
    };

    const sortedData = [...tableData].sort((a, b) => {
        const aValue = a[orderBy];
        const bValue = b[orderBy];

        if (order === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
        }
    });

    useEffect(() => {
        if (item) {
            let categoryId = '';
            if (item.category) {
                const foundCategory = categories.find(cat =>
                    cat.label === item.category || cat.value === item.category
                );
                categoryId = foundCategory ? foundCategory.value : '';
            }

            let componentTypeValue = '';
            if (item.componentType && categoryId) {
                const components = getComponentsForCategory();
                const foundComponent = components.find(comp =>
                    comp.label === item.componentType || comp.value === item.componentType
                );
                componentTypeValue = foundComponent ? foundComponent.value : '';
            }

            let manufacturerId = '';
            if (item.manufacturer && categoryId && componentTypeValue) {
                const manufacturers = getManufacturersForComponent();
                const foundManufacturer = manufacturers.find(man =>
                    man.label === item.manufacturer || man.value === item.manufacturer
                );
                manufacturerId = foundManufacturer ? foundManufacturer.value : '';
            }

            let modelId = '';
            if (item.model && manufacturerId) {
                const models = getModelsForManufacturer();
                const foundModel = models.find(mod =>
                    mod.label === item.model || mod.value === item.model
                );
                modelId = foundModel ? foundModel.value : '';
            }

            setFormData({
                category: categoryId,
                componentType: componentTypeValue,
                manufacturer: manufacturerId,
                model: modelId,
                customLabel: item.customLabel || '',
                serial: item.serial || '',
                tankSize: item.tankSize || ''
            });
        }
    }, [item]);

    const columns = [
        { id: 'edit', label: 'Edit', width: 60, align: 'center' },
        { id: 'component', label: 'Component', width: 200 },
        { id: 'userDefinedLabel', label: 'User Defined Label', width: 180 },
        { id: 'manufacturer', label: 'Manufacturer', width: 140 },
        { id: 'model', label: 'Model', width: 120 },
        { id: 'serial', label: 'Serial', width: 120 },
        { id: 'tankSize', label: 'Tank Size', width: 100 },
        { id: 'sortOrder', label: 'Sort Order', width: 100, align: 'center' },
        { id: 'delete', label: 'Delete', width: 70, align: 'center' },
    ];

    return (
        <Box sx={{
            width: '100%',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
        }}>
            <Box sx={{
                flex: isMobile ? '0 0 auto' : '0 0 400px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
            }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Typography variant="h6" sx={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: TEXT_COLOR,
                        letterSpacing: '0.3px'
                    }}>
                        {selectedComponent ? 'Edit Component' : 'Add New Component'}
                        {selectedComponent && (
                            <Typography component="span" sx={{
                                fontSize: '0.7rem',
                                color: GRAY_COLOR,
                                ml: 1,
                                fontWeight: 400
                            }}>
                                (Sort Order: {selectedComponent.sortOrder})
                            </Typography>
                        )}
                    </Typography>
                </Box>
                <Box sx={{
                    borderRadius: '3px',
                    border: `1px solid ${alpha(GRAY_COLOR, 0.2)}`,
                    backgroundColor: 'white',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                }}>
                    <Box sx={{
                        p: 1,
                        flex: 1,
                        backgroundColor: alpha(GRAY_COLOR, 0.01),
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': {
                            width: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: alpha(GRAY_COLOR, 0.05),
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: alpha(GRAY_COLOR, 0.2),
                            borderRadius: '3px',
                        }
                    }}>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 0.5,
                            p: 0.4,
                            backgroundColor: alpha(GRAY_COLOR, 0.03),
                            borderRadius: '4px'
                        }}>
                            <Box sx={{ flex: '0 0 140px', minWidth: 0 }}>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.7rem',
                                    color: GRAY_COLOR,
                                    fontWeight: 500
                                }}>
                                    Category
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <FormControl fullWidth size="small">
                                    <StyledSelect
                                        value={formData.category}
                                        onChange={(e) => handleChange('category', e.target.value)}
                                        displayEmpty
                                        sx={{
                                            '& .MuiSelect-select': {
                                                fontSize: '0.8rem',
                                                py: 0.5,
                                                minHeight: 'auto',
                                                fontWeight: 500,
                                                color: formData.category ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                            }
                                        }}
                                    >
                                        {categoriesWithPlaceholder.map((cat) => (
                                            <MenuItem
                                                key={cat.value}
                                                value={cat.value}
                                                sx={{
                                                    fontSize: '0.8rem',
                                                    py: 0.5,
                                                    color: cat.value ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                                }}
                                            >
                                                {cat.label}
                                            </MenuItem>
                                        ))}
                                    </StyledSelect>
                                </FormControl>
                                <Typography variant="caption" sx={{
                                    color: 'error.main',
                                    fontSize: '0.65rem',
                                    mt: 0.5,
                                    display: 'block'
                                }}>
                                    Required
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 0.5,
                            p: 0.4,
                            backgroundColor: alpha(GRAY_COLOR, 0.03),
                            borderRadius: '4px'
                        }}>
                            <Box sx={{ flex: '0 0 140px', minWidth: 0 }}>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.7rem',
                                    color: GRAY_COLOR,
                                    fontWeight: 500
                                }}>
                                    Component Type
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <FormControl fullWidth size="small">
                                    <StyledSelect
                                        value={formData.componentType}
                                        onChange={(e) => handleChange('componentType', e.target.value)}
                                        disabled={!formData.category}
                                        displayEmpty
                                        sx={{
                                            '& .MuiSelect-select': {
                                                fontSize: '0.8rem',
                                                py: 0.5,
                                                minHeight: 'auto',
                                                fontWeight: 500,
                                                color: formData.componentType ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                            }
                                        }}
                                    >
                                        {getComponentsForCategory().map((type) => (
                                            <MenuItem
                                                key={type.value}
                                                value={type.value}
                                                sx={{
                                                    fontSize: '0.8rem',
                                                    py: 0.5,
                                                    color: type.value ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                                }}
                                            >
                                                {type.label}
                                            </MenuItem>
                                        ))}
                                    </StyledSelect>
                                </FormControl>
                                <Typography variant="caption" sx={{
                                    color: 'error.main',
                                    fontSize: '0.65rem',
                                    mt: 0.5,
                                    display: 'block'
                                }}>
                                    Required
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 0.5,
                            p: 0.4,
                            backgroundColor: alpha(GRAY_COLOR, 0.03),
                            borderRadius: '4px'
                        }}>
                            <Box sx={{ flex: '0 0 140px', minWidth: 0 }}>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.7rem',
                                    color: GRAY_COLOR,
                                    fontWeight: 500
                                }}>
                                    Manufacturer
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <FormControl fullWidth size="small">
                                    <StyledSelect
                                        value={formData.manufacturer}
                                        onChange={(e) => handleChange('manufacturer', e.target.value)}
                                        disabled={!formData.componentType}
                                        displayEmpty
                                        sx={{
                                            '& .MuiSelect-select': {
                                                fontSize: '0.8rem',
                                                py: 0.5,
                                                minHeight: 'auto',
                                                fontWeight: 500,
                                                color: formData.manufacturer ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                            }
                                        }}
                                    >
                                        {getManufacturersForComponent().map((man) => (
                                            <MenuItem
                                                key={man.value}
                                                value={man.value}
                                                sx={{
                                                    fontSize: '0.8rem',
                                                    py: 0.5,
                                                    color: man.value ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                                }}
                                            >
                                                {man.label}
                                            </MenuItem>
                                        ))}
                                    </StyledSelect>
                                </FormControl>
                                <Typography variant="caption" sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.65rem',
                                    mt: 0.5,
                                    display: 'block'
                                }}>
                                    Optional
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 0.5,
                            p: 0.4,
                            backgroundColor: alpha(GRAY_COLOR, 0.03),
                            borderRadius: '4px'
                        }}>
                            <Box sx={{ flex: '0 0 140px', minWidth: 0 }}>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.7rem',
                                    color: GRAY_COLOR,
                                    fontWeight: 500
                                }}>
                                    Model
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <FormControl fullWidth size="small">
                                    <StyledSelect
                                        value={formData.model}
                                        onChange={(e) => handleChange('model', e.target.value)}
                                        disabled={!formData.manufacturer}
                                        displayEmpty
                                        sx={{
                                            '& .MuiSelect-select': {
                                                fontSize: '0.8rem',
                                                py: 0.5,
                                                minHeight: 'auto',
                                                fontWeight: 500,
                                                color: formData.model ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                            }
                                        }}
                                    >
                                        {getModelsForManufacturer().map((model) => (
                                            <MenuItem
                                                key={model.value}
                                                value={model.value}
                                                sx={{
                                                    fontSize: '0.8rem',
                                                    py: 0.5,
                                                    color: model.value ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                                }}
                                            >
                                                {model.label}
                                            </MenuItem>
                                        ))}
                                    </StyledSelect>
                                </FormControl>
                                <Typography variant="caption" sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.65rem',
                                    mt: 0.5,
                                    display: 'block'
                                }}>
                                    Optional
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            mb: 0.5,
                            p: 0.4,
                            backgroundColor: alpha(GRAY_COLOR, 0.03),
                            borderRadius: '4px'
                        }}>
                            <Box sx={{ flex: '0 0 140px', minWidth: 0, pt: 0.5 }}>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.7rem',
                                    color: GRAY_COLOR,
                                    fontWeight: 500
                                }}>
                                    Custom Label
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <StyledTextField
                                    fullWidth
                                    size="small"
                                    value={formData.customLabel}
                                    onChange={(e) => handleChange('customLabel', e.target.value)}
                                    placeholder="Enter custom label (optional)"
                                    InputProps={{
                                        sx: {
                                            fontSize: '0.8rem',
                                            py: 0.5,
                                            minHeight: 'auto',
                                            fontWeight: 500,
                                            color: formData.customLabel ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                        }
                                    }}
                                />
                                <Typography variant="caption" sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.65rem',
                                    mt: 0.5,
                                    display: 'block'
                                }}>
                                    Optional
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 0.5,
                            p: 0.4,
                            backgroundColor: alpha(GRAY_COLOR, 0.03),
                            borderRadius: '4px'
                        }}>
                            <Box sx={{ flex: '0 0 140px', minWidth: 0 }}>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.7rem',
                                    color: GRAY_COLOR,
                                    fontWeight: 500
                                }}>
                                    Serial Number
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <StyledTextField
                                    fullWidth
                                    size="small"
                                    value={formData.serial}
                                    onChange={(e) => handleChange('serial', e.target.value)}
                                    placeholder="Enter serial number (optional)"
                                    InputProps={{
                                        sx: {
                                            fontSize: '0.8rem',
                                            py: 0.5,
                                            minHeight: 'auto',
                                            fontWeight: 500,
                                            color: formData.serial ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                        }
                                    }}
                                />
                                <Typography variant="caption" sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.65rem',
                                    mt: 0.5,
                                    display: 'block'
                                }}>
                                    Optional
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 0.4,
                            backgroundColor: alpha(GRAY_COLOR, 0.03),
                            borderRadius: '4px'
                        }}>
                            <Box sx={{ flex: '0 0 140px', minWidth: 0 }}>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.7rem',
                                    color: GRAY_COLOR,
                                    fontWeight: 500
                                }}>
                                    Tank Size
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <StyledTextField
                                    fullWidth
                                    size="small"
                                    value={formData.tankSize}
                                    onChange={(e) => handleChange('tankSize', e.target.value)}
                                    placeholder="Enter tank size (optional)"
                                    InputProps={{
                                        sx: {
                                            fontSize: '0.8rem',
                                            py: 0.5,
                                            minHeight: 'auto',
                                            fontWeight: 500,
                                            color: formData.tankSize ? TEXT_COLOR : alpha(GRAY_COLOR, 0.7)
                                        }
                                    }}
                                />
                                <Typography variant="caption" sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.65rem',
                                    mt: 0.5,
                                    display: 'block'
                                }}>
                                    Optional
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{
                        p: 1.5,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 0.4,
                        backgroundColor: alpha(GRAY_COLOR, 0.01)
                    }}>
                        <OutlineButton
                            variant="outlined"
                            onClick={resetForm}
                            startIcon={<X size={14} />}
                            sx={{
                                fontSize: '0.75rem',
                                py: 0.375,
                                px: 1.5,
                                minHeight: '32px',
                                borderWidth: '1px',
                                '& .MuiButton-startIcon': {
                                    mr: 0.5
                                }
                            }}
                        >
                            Clear
                        </OutlineButton>
                        <UpdateButton
                            variant="contained"
                            onClick={handleSubmit}
                            color="warning"
                            size="small"
                            disabled={!formData.category || !formData.componentType}
                            startIcon={<Save size={14} />}
                            sx={{
                                fontSize: '0.75rem',
                                py: 0.375,
                                px: 1.5,
                                minHeight: '32px',
                                '& .MuiButton-startIcon': {
                                    mr: 0.5
                                }
                            }}
                        >
                            {selectedComponent ? 'Save Changes' : 'Add New Component'}
                        </UpdateButton>
                    </Box>
                </Box>
            </Box>

            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0
            }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 0.5
                }}>
                    <Typography variant="h6" sx={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: TEXT_COLOR,
                        letterSpacing: '0.3px',
                        mb: 1
                    }}>
                        Components ({tableData.length})
                    </Typography>
                </Box>

                <Paper sx={{
                    width: '100%',
                    overflow: 'hidden',
                    border: `1px solid ${alpha(GRAY_COLOR, 0.2)}`,
                    borderRadius: '3px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <TableContainer sx={{
                        flex: 1,
                        maxHeight: 'calc(100vh - 300px)'
                    }}>
                        <Table
                            size="small"
                            stickyHeader
                            sx={{
                                '& .MuiTableCell-root': {
                                    fontSize: '0.75rem',
                                    py: 0.5,
                                    px: 1,
                                    borderRight: `1px solid ${alpha(GRAY_COLOR, 0.1)}`,
                                    '&:last-child': {
                                        borderRight: 'none'
                                    }
                                },
                                '& .MuiTableHead-root': {
                                    '& .MuiTableCell-root': {
                                        backgroundColor: alpha(GRAY_COLOR, 0.04),
                                        fontWeight: 600,
                                        color: TEXT_COLOR,
                                        borderBottom: `2px solid ${alpha(GRAY_COLOR, 0.2)}`,
                                    }
                                },
                                '& .MuiTableBody-root': {
                                    '& .MuiTableRow-root:hover': {
                                        backgroundColor: alpha(BLUE_COLOR, 0.02)
                                    },
                                    '& .MuiTableRow-root.Mui-selected': {
                                        backgroundColor: alpha(ORANGE_COLOR, 0.08)
                                    }
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            align={column.align || 'left'}
                                            sx={{
                                                width: column.width,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {column.id === 'sortOrder' || column.id === 'component' ? (
                                                <TableSortLabel
                                                    active={orderBy === column.id}
                                                    direction={orderBy === column.id ? order : 'asc'}
                                                    onClick={() => handleRequestSort(column.id)}
                                                    sx={{
                                                        fontSize: '0.75rem',
                                                        '& .MuiTableSortLabel-icon': {
                                                            fontSize: '0.9rem'
                                                        }
                                                    }}
                                                >
                                                    {column.label}
                                                </TableSortLabel>
                                            ) : (
                                                column.label
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedData.map((row) => {
                                    const isSelected = selectedComponent?.id === row.id;
                                    const { category, componentType } = splitComponentName(row.component);

                                    return (
                                        <TableRow
                                            hover
                                            key={row.id}
                                            selected={isSelected}
                                            onClick={() => handleEdit(row)}
                                            sx={{
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? alpha(ORANGE_COLOR, 0.08) : 'inherit',
                                                '&:hover': {
                                                    backgroundColor: isSelected ? alpha(ORANGE_COLOR, 0.12) : alpha(BLUE_COLOR, 0.02)
                                                }
                                            }}
                                        >
                                            <TableCell align="center" sx={{ width: '60px' }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(row);
                                                    }}
                                                    sx={{
                                                        p: 0.25,
                                                        color: isSelected ? ORANGE_COLOR : 'primary.main',
                                                        '&:hover': {
                                                            backgroundColor: alpha(isSelected ? ORANGE_COLOR : BLUE_COLOR, 0.1)
                                                        }
                                                    }}
                                                >
                                                    <Edit size={14} />
                                                </IconButton>
                                            </TableCell>

                                            <TableCell sx={{ width: '200px' }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: TEXT_COLOR
                                                    }}>
                                                        {category}:
                                                    </Typography>
                                                    <Typography variant="body2" sx={{
                                                        fontSize: '0.75rem',
                                                        color: GRAY_COLOR,
                                                        mt: 0.25
                                                    }}>
                                                        {componentType}
                                                    </Typography>
                                                </Box>
                                            </TableCell>

                                            <TableCell sx={{ width: '180px' }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                    {row.userDefinedLabel || '-'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell sx={{ width: '140px' }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                    {row.manufacturer || '-'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell sx={{ width: '120px' }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                    {row.model || '-'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell sx={{ width: '120px' }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                    {row.serial || '-'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell sx={{ width: '100px' }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                    {row.tankSize || '-'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="center" sx={{ width: '100px' }}>
                                                <Chip
                                                    label={row.sortOrder}
                                                    size="small"
                                                    sx={{
                                                        fontSize: '0.7rem',
                                                        height: '20px',
                                                        minWidth: '30px',
                                                        fontWeight: 600,
                                                        backgroundColor: alpha(BLUE_COLOR, 0.1),
                                                        color: BLUE_COLOR
                                                    }}
                                                />
                                            </TableCell>

                                            <TableCell align="center" sx={{ width: '70px' }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(row.id);
                                                    }}
                                                    sx={{
                                                        p: 0.25,
                                                        color: 'error.main',
                                                        '&:hover': {
                                                            backgroundColor: alpha('#F44336', 0.1)
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {tableData.length === 0 && (
                        <Box sx={{
                            p: 3,
                            textAlign: 'center',
                            color: GRAY_COLOR
                        }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                No components found. Add some components to get started.
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{
                        borderTop: `1px solid ${alpha(GRAY_COLOR, 0.2)}`,
                        p: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: alpha(GRAY_COLOR, 0.02)
                    }}>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: GRAY_COLOR }}>
                            {tableData.length} items
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: GRAY_COLOR }}>
                                Sort by:
                            </Typography>
                            <StyledSelect
                                size="small"
                                value={orderBy}
                                onChange={(e) => setOrderBy(e.target.value)}
                                sx={{
                                    fontSize: '0.7rem',
                                    height: '24px',
                                    '& .MuiSelect-select': {
                                        py: 0.25,
                                        fontSize: '0.7rem'
                                    }
                                }}
                            >
                                <MenuItem value="sortOrder" sx={{ fontSize: '0.7rem' }}>Sort Order</MenuItem>
                                <MenuItem value="component" sx={{ fontSize: '0.7rem' }}>Component</MenuItem>
                                <MenuItem value="manufacturer" sx={{ fontSize: '0.7rem' }}>Manufacturer</MenuItem>
                            </StyledSelect>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};

export default UpdateComponent;