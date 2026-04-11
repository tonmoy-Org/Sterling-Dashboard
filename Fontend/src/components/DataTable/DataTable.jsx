import React from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Box,
    Chip,
    Typography,
    alpha,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Search, X, User } from 'lucide-react';

const DEFAULT_COLORS = {
    text: '#0F1115',
    primary: '#1976d2',
    success: '#10b981',
    error: '#ef4444',
    warning: '#ed6c02',
    gray: '#6b7280',
};

const SearchInput = ({
    value,
    onChange,
    placeholder = 'Search...',
    color = DEFAULT_COLORS.primary,
    fullWidth = false,
    sx = {}
}) => {
    return (
        <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 250, ...sx }}>
            <Box
                component="input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                sx={{
                    width: '100%',
                    fontSize: '0.8rem',
                    height: '36px',
                    paddingLeft: '36px',
                    paddingRight: value ? '36px' : '16px',
                    border: `1px solid ${alpha(color, 0.2)}`,
                    borderRadius: '4px',
                    outline: 'none',
                    backgroundColor: 'white',
                    '&:focus': {
                        borderColor: color,
                        boxShadow: `0 0 0 2px ${alpha(color, 0.1)}`,
                    },
                    '&::placeholder': {
                        color: alpha(DEFAULT_COLORS.gray, 0.6),
                    },
                }}
            />
            <Search
                size={16}
                color={DEFAULT_COLORS.gray}
                style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                }}
            />
            {value && (
                <Box
                    component="button"
                    onClick={() => onChange('')}
                    sx={{
                        position: 'absolute',
                        right: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '4px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: DEFAULT_COLORS.gray,
                        '&:hover': {
                            color: DEFAULT_COLORS.text,
                        },
                    }}
                >
                    <X size={16} />
                </Box>
            )}
        </Box>
    );
};

const EmptyState = ({
    icon: Icon = User,
    title,
    description,
    iconSize = 32,
    iconColor = 'rgba(15, 17, 21, 0.2)',
    textColor = DEFAULT_COLORS.text,
}) => {
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            py: 6,
            px: 2,
        }}>
            <Icon size={iconSize} color={iconColor} />
            <Typography
                variant="body2"
                sx={{
                    color: textColor,
                    opacity: 0.6,
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    textAlign: 'center',
                }}
            >
                {title}
            </Typography>
            {description && (
                <Typography
                    variant="caption"
                    sx={{
                        color: textColor,
                        opacity: 0.4,
                        fontSize: '0.75rem',
                        textAlign: 'center',
                        maxWidth: '300px',
                        lineHeight: 1.4,
                    }}
                >
                    {description}
                </Typography>
            )}
        </Box>
    );
};

export const DataTable = ({
    data = [],
    columns = [],
    pagination = true,
    page = 0,
    rowsPerPage = 10,
    totalCount = 0,
    rowsPerPageOptions = [5, 10, 25, 50],
    onPageChange,
    onRowsPerPageChange,
    search = true,
    searchValue = '',
    onSearchChange,
    searchPlaceholder = 'Search...',
    title = '',
    subtitle = '',
    showCount = true,
    headerActions = null,
    color = DEFAULT_COLORS.primary,
    borderColor = null,
    elevation = 0,
    minWidth = 800,
    loading = false,
    loadingComponent = null,
    emptyStateTitle = 'No data found.',
    emptyStateDescription = '',
    emptyStateIcon = User,
    renderRow,
    renderHeader = null,
    renderFooter = null,
    isMobile: externalIsMobile,
    onRowClick,
    sx = {},
    tableSx = {},
    containerSx = {},
}) => {
    const theme = useTheme();
    const internalIsMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isMobile = externalIsMobile !== undefined ? externalIsMobile : internalIsMobile;

    const tableBorderColor = borderColor || alpha(color, 0.15);
    const headerBgColor = alpha(color, 0.04);
    const headerBorderColor = alpha(color, 0.1);

    const showingCount = pagination
        ? Math.min((page * rowsPerPage) + rowsPerPage, totalCount || data.length)
        : data.length;

    const handleRowClick = (row, index) => {
        if (onRowClick) {
            onRowClick(row, index);
        }
    };

    const renderDefaultRow = (row, index) => {
        return (
            <TableRow
                key={row.id || index}
                hover={!!onRowClick}
                onClick={() => handleRowClick(row, index)}
                sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:hover': {
                        backgroundColor: onRowClick ? alpha(color, 0.05) : 'inherit',
                    },
                    '&:last-child td': {
                        borderBottom: 'none',
                    },
                }}
            >
                {columns.map((column, colIndex) => (
                    <TableCell
                        key={colIndex}
                        align={column.align || 'left'}
                        sx={{
                            py: isMobile ? 1.25 : 1.75,
                            px: isMobile ? 1 : 2,
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            ...column.sx,
                        }}
                    >
                        {column.render ? column.render(row) : row[column.field]}
                    </TableCell>
                ))}
            </TableRow>
        );
    };

    return (
        <Paper
            elevation={elevation}
            sx={{
                mb: 4,
                borderRadius: isMobile ? '4px' : '6px',
                overflow: 'hidden',
                border: `1px solid ${tableBorderColor}`,
                bgcolor: 'white',
                width: '100%',
                ...sx,
            }}
        >
            {(title || search || headerActions) && (
                <Box
                    sx={{
                        p: isMobile ? 1.25 : 2,
                        bgcolor: 'white',
                        borderBottom: `1px solid ${headerBorderColor}`,
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: isMobile ? 1.5 : 2,
                    }}
                >
                    {/* Left Section - Title & Subtitle */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                        flex: isMobile ? '1 1 auto' : '0 1 auto',
                        minWidth: 0, // For text truncation
                    }}>
                        {title && (
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexWrap: 'wrap',
                            }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontSize: isMobile ? '0.95rem' : '1.1rem',
                                        color: DEFAULT_COLORS.text,
                                        fontWeight: 600,
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {title}
                                </Typography>
                                {showCount && (
                                    <Chip
                                        size="small"
                                        label={totalCount || data.length}
                                        sx={{
                                            bgcolor: alpha(color, 0.08),
                                            color: DEFAULT_COLORS.text,
                                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                                            fontWeight: 500,
                                            height: '22px',
                                            '& .MuiChip-label': {
                                                px: 1.25,
                                                py: 0.25,
                                            },
                                        }}
                                    />
                                )}
                            </Box>
                        )}
                        {subtitle && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: DEFAULT_COLORS.gray,
                                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                                    fontWeight: 400,
                                    lineHeight: 1.4,
                                }}
                            >
                                {subtitle}
                            </Typography>
                        )}
                    </Box>

                    {/* Right Section - Search & Actions */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: 1.5,
                        flex: isMobile ? '1 1 auto' : '0 1 auto',
                        minWidth: isMobile ? '100%' : 'auto',
                        alignItems: 'stretch',
                    }}>
                        {search && (
                            <SearchInput
                                value={searchValue}
                                onChange={onSearchChange}
                                placeholder={searchPlaceholder}
                                color={color}
                                fullWidth={isMobile}
                                sx={{
                                    minWidth: isMobile ? '100%' : 280,
                                }}
                            />
                        )}
                    </Box>
                </Box>
            )}

            {renderHeader && renderHeader()}

            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    overflowX: 'auto',
                    maxWidth: '100%',
                    position: 'relative',
                    '&::-webkit-scrollbar': {
                        height: '8px',
                        width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        backgroundColor: alpha(color, 0.05),
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: alpha(color, 0.2),
                        borderRadius: '4px',
                        '&:hover': {
                            backgroundColor: alpha(color, 0.3),
                        },
                    },
                    ...containerSx,
                }}
            >
                {loading && loadingComponent}

                {!loading && (
                    <Table
                        size={isMobile ? 'small' : 'medium'}
                        sx={{
                            minWidth: isMobile ? 600 : minWidth,
                            '& .MuiTableCell-root': {
                                transition: 'all 0.2s ease',
                            },
                            ...tableSx,
                        }}
                    >
                        <TableHead>
                            <TableRow sx={{
                                bgcolor: headerBgColor,
                                '& th': {
                                    borderBottom: `2px solid ${headerBorderColor}`,
                                    py: isMobile ? 1.25 : 1.75,
                                    px: isMobile ? 1 : 2,
                                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                                    fontWeight: 600,
                                    color: DEFAULT_COLORS.text,
                                    whiteSpace: 'nowrap',
                                    letterSpacing: '0.025em',
                                }
                            }}>
                                {columns.map((column, index) => (
                                    <TableCell
                                        key={index}
                                        align={column.align || 'left'}
                                        sx={{
                                            minWidth: column.minWidth || (isMobile ? 100 : 120),
                                            ...column.headerSx,
                                        }}
                                    >
                                        {column.header}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {data.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        align="center"
                                        sx={{ py: 6 }}
                                    >
                                        <EmptyState
                                            icon={emptyStateIcon}
                                            title={emptyStateTitle}
                                            description={emptyStateDescription}
                                        />
                                    </TableCell>
                                </TableRow>
                            )}

                            {data.length > 0 && data.map((row, index) => (
                                renderRow
                                    ? renderRow(row, index)
                                    : renderDefaultRow(row, index)
                            ))}
                        </TableBody>
                    </Table>
                )}

                {pagination && totalCount > 0 && (
                    <TablePagination
                        rowsPerPageOptions={rowsPerPageOptions}
                        component="div"
                        count={totalCount}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={onPageChange}
                        onRowsPerPageChange={onRowsPerPageChange}
                        SelectProps={{
                            MenuProps: {
                                disableScrollLock: true
                            }
                        }}
                        sx={{
                            borderTop: `1px solid ${headerBorderColor}`,
                            '& .MuiTablePagination-toolbar': {
                                minHeight: '52px',
                                px: isMobile ? 1 : 2,
                                flexDirection: isMobile ? 'column' : 'row',
                                gap: isMobile ? 1 : 0,
                                alignItems: isMobile ? 'flex-start' : 'center',
                            },
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                fontSize: isMobile ? '0.75rem' : '0.8rem',
                                mb: isMobile ? 0.5 : 0,
                            },
                            '& .MuiTablePagination-actions': {
                                marginLeft: isMobile ? 'auto' : 0,
                            },
                            '& .MuiTablePagination-selectRoot': {
                                mr: 1,
                            },
                        }}
                    />
                )}
            </TableContainer>

            {renderFooter && renderFooter()}

            {!pagination && data.length > 0 && (
                <Box
                    sx={{
                        p: isMobile ? 1.25 : 2,
                        borderTop: `1px solid ${headerBorderColor}`,
                        bgcolor: alpha(color, 0.02),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            color: DEFAULT_COLORS.gray,
                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                            fontWeight: 400,
                        }}
                    >
                        Showing {showingCount} of {totalCount || data.length} items
                    </Typography>

                    {headerActions && isMobile && (
                        <Box sx={{
                            display: 'flex',
                            gap: 1,
                            '& > *': {
                                flex: 1,
                            }
                        }}>
                            {headerActions}
                        </Box>
                    )}
                </Box>
            )}
        </Paper>
    );
};

export const withUserTable = (Component) => {
    return (props) => {
        const { color = DEFAULT_COLORS.primary, ...rest } = props;
        return <Component color={color} {...rest} />;
    };
};

export const UserManagementTable = (props) => (
    <DataTable
        color={DEFAULT_COLORS.primary}
        searchPlaceholder="Search users..."
        emptyStateTitle="No users found."
        emptyStateDescription="Create one to get started."
        {...props}
    />
);

export const TechUserTable = (props) => (
    <DataTable
        color={DEFAULT_COLORS.success}
        searchPlaceholder="Search tech users..."
        emptyStateTitle="No tech users found."
        emptyStateDescription="Create one to get started."
        {...props}
    />
);

export const ReadOnlyUserTable = (props) => (
    <DataTable
        color={DEFAULT_COLORS.success}
        searchPlaceholder="Search users..."
        emptyStateTitle="No users found."
        {...props}
    />
);