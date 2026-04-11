export const parseDashboardAddress = (fullAddress) => {
    if (!fullAddress) return { street: '', city: '', state: '', zip: '', original: '' };
    const parts = fullAddress.split(' - ');
    if (parts.length < 2) return { street: fullAddress, city: '', state: '', zip: '', original: fullAddress };
    const street = parts[0].trim();
    const remaining = parts[1].trim();
    const zipMatch = remaining.match(/\b\d{5}\b/);
    const zip = zipMatch ? zipMatch[0] : '';
    const withoutZip = remaining.replace(zip, '').trim();
    const cityState = withoutZip.split(',').map(s => s.trim());
    return {
        street,
        city: cityState[0] || '',
        state: cityState[1] || '',
        zip,
        original: fullAddress,
    };
};